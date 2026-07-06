namespace Mkc.Copilot.Extensions.Core.Policy;

/// <summary>Härtegrad der Guardrails: Block = Work-Welt (Deny), Warn = Home-Welt (Confirm statt Deny).</summary>
public enum PolicyMode { Block, Warn }

/// <summary>Konfiguration der Git-Regeln (Default: Work-Welt, ADR-0004).</summary>
public sealed record GitPolicy
{
    public string[] ProtectedBranches { get; init; } = ["main", "master", "develop"];
    public string[] ProtectedBranchPrefixes { get; init; } = ["release/"];

    /// <summary>
    /// Block (Default, Work): destruktive Ops werden verweigert.
    /// Warn (Home): nicht-geschützte destruktive Ops werden zu Confirm herabgestuft;
    /// force-push auf geschützte Branches bleibt IMMER Deny (ADR-0004).
    /// </summary>
    public PolicyMode Mode { get; init; } = PolicyMode.Block;

    public bool IsProtected(string branch) =>
        ProtectedBranches.Contains(branch, StringComparer.OrdinalIgnoreCase)
        || ProtectedBranchPrefixes.Any(p => branch.StartsWith(p, StringComparison.OrdinalIgnoreCase));
}

/// <summary>
/// argv-basierte Umsetzung der ADR-0004-Regeltabelle (Work = block).
/// Hard-Deny in jedem Modus; Confirm wird vom Aufrufer modus-abhängig aufgelöst.
/// </summary>
public static class GitGuardrails
{
    // Diese Denies bleiben auch im Warn-Modus hart (ADR-0004: geschützte Branches).
    private static readonly HashSet<string> AlwaysHard =
        ["git-push-force-protected", "git-push-lease-protected", "git-push-delete-protected"];

    public static PolicyDecision Evaluate(string[] argv, GitPolicy policy)
    {
        var decision = EvaluateCore(argv, policy);
        // Home-Welt: nicht-geschützte Denies zu Confirm herabstufen.
        if (policy.Mode == PolicyMode.Warn && decision.Verdict == Verdict.Deny && !AlwaysHard.Contains(decision.Rule))
            return decision with { Verdict = Verdict.Confirm };
        return decision;
    }

    private static PolicyDecision EvaluateCore(string[] argv, GitPolicy policy)
    {
        if (argv.Length < 2 || argv[0] != "git") return PolicyDecision.Allow;
        var sub = argv[1];
        var rest = argv[2..];

        return sub switch
        {
            "push" => EvaluatePush(rest, policy),
            "reset" when rest.Contains("--hard") =>
                PolicyDecision.Confirm("git-reset-hard", "git reset --hard verwirft lokale Änderungen unwiderruflich."),
            "clean" when HasCleanForce(rest) =>
                PolicyDecision.Deny("git-clean-force", "git clean -f[dx] löscht ungetrackte Dateien unwiderruflich."),
            "branch" when rest.Contains("-D") =>
                PolicyDecision.Deny("git-branch-force-delete", "git branch -D löscht auch nicht gemergte Branches."),
            "checkout" when rest.Contains("-f") || rest.Contains("--force") =>
                PolicyDecision.Confirm("git-checkout-force", "git checkout -f überschreibt lokale Änderungen."),
            "switch" when rest.Contains("-f") || rest.Contains("--force") || rest.Contains("--discard-changes") =>
                PolicyDecision.Confirm("git-switch-force", "git switch --force verwirft lokale Änderungen."),
            "rebase" when rest.Any(a => !a.StartsWith('-') && policy.IsProtected(StripRemotePrefix(a))) =>
                PolicyDecision.Deny("git-rebase-shared", "Rebase auf geteilte Branches schreibt Historie um."),
            "filter-branch" or "filter-repo" =>
                PolicyDecision.Deny("git-filter", $"git {sub} schreibt die Repository-Historie um."),
            "update-ref" when rest.Contains("-d") =>
                PolicyDecision.Deny("git-update-ref-delete", "git update-ref -d löscht Referenzen."),
            "reflog" when rest.Length > 0 && rest[0] is "delete" or "expire" =>
                PolicyDecision.Deny("git-reflog-delete", "Reflog-Löschung zerstört das Sicherheitsnetz."),
            "stash" when rest.Length > 0 && rest[0] is "drop" or "clear" =>
                PolicyDecision.Confirm("git-stash-drop", "Stash-Einträge gehen unwiderruflich verloren."),
            _ => PolicyDecision.Allow,
        };
    }

    private static PolicyDecision EvaluatePush(string[] rest, GitPolicy policy)
    {
        var hasForce = rest.Contains("-f") || rest.Contains("--force")
                       || rest.Any(a => a.StartsWith("--force=", StringComparison.Ordinal));
        var hasLease = rest.Any(a => a == "--force-with-lease" || a.StartsWith("--force-with-lease=", StringComparison.Ordinal));
        var hasDelete = rest.Contains("-d") || rest.Contains("--delete");

        var targetBranch = ResolveTargetBranch(rest);
        var isProtected = targetBranch is not null && policy.IsProtected(targetBranch);

        if (hasDelete && isProtected)
            return PolicyDecision.Deny("git-push-delete-protected", $"Löschen des geschützten Branches '{targetBranch}' ist gesperrt.");
        if (hasForce && !hasLease)
            return isProtected
                ? PolicyDecision.Deny("git-push-force-protected", $"git push --force auf geschützten Branch '{targetBranch}' ist gesperrt.")
                : PolicyDecision.Deny("git-push-force", "git push --force ist gesperrt — nutze --force-with-lease.");
        if (hasLease && isProtected)
            return PolicyDecision.Deny("git-push-lease-protected", $"Auch --force-with-lease ist auf '{targetBranch}' gesperrt.");
        return PolicyDecision.Allow;
    }

    /// <summary>
    /// Zielbranch = Teil hinter ':' im Refspec, sonst der Refspec selbst (2. Nicht-Flag-Arg nach Remote).
    /// Ohne expliziten Refspec (`git push --force-with-lease origin`) ist das Ziel der aktuell
    /// ausgecheckte Branch — hier nicht ohne git ermittelbar; die reine `-f`-Sperre (EvaluatePush)
    /// greift dann unabhängig, `--force-with-lease` bleibt zulässig (verliert keine fremden Commits).
    /// </summary>
    private static string? ResolveTargetBranch(string[] rest)
    {
        var positional = rest.Where(a => !a.StartsWith('-')).ToArray();
        if (positional.Length < 2) return null;
        var refspec = positional[1];
        var colon = refspec.IndexOf(':');
        var branch = colon >= 0 ? refspec[(colon + 1)..] : refspec;
        return StripRemotePrefix(branch.TrimStart('+'));
    }

    private static string StripRemotePrefix(string reference)
    {
        var r = reference;
        if (r.StartsWith("refs/heads/", StringComparison.Ordinal)) r = r["refs/heads/".Length..];
        else if (r.StartsWith("origin/", StringComparison.Ordinal)) r = r["origin/".Length..];
        return r;
    }

    private static bool HasCleanForce(string[] rest) =>
        rest.Any(a => a.StartsWith('-') && !a.StartsWith("--") && a.Contains('f'))
        || rest.Contains("--force");
}
