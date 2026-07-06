using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Policy;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;

namespace Mkc.Copilot.Extensions.Guardian;

/// <summary>
/// mkc-work-guardian: deterministische Policy als Code (fail-closed).
/// preToolUse: Git-Guardrails + Tool-Guardian + Secret-Scan + Branch-Lint.
/// Confirm-Fälle: interaktiv ⇒ ui.confirm (Deadline 60 s), sonst deny.
/// </summary>
public sealed class GuardianExtension(StateStore store, ModeContract modeContract, GitPolicy policy) : IExtensionHead
{
    private const string ExtensionName = "mkc-work-guardian";
    private readonly DenyLog _denyLog = new(store);
    private BridgeHost? _host;

    public ReadyEvent Identity => new(ExtensionName, "0.1.0", BridgeProtocol.Version);

    public RegistrationManifest Manifest => new()
    {
        Name = ExtensionName,
        Version = "0.1.0",
        Hooks = ["preToolUse", "postToolUse", "sessionStart", "sessionEnd"],
        Commands = [new("guardian", "Guardian-Status, letzte Deny-Begründung (why), effektive Policy (policy)")],
    };

    public void Register(BridgeHost host)
    {
        _host = host;
        host.On<PreToolUsePayload, PreToolUseResult>("hook.preToolUse", OnPreToolUseAsync);
        host.On<PostToolUsePayload, PostToolUseResult>("hook.postToolUse", OnPostToolUseAsync);
        host.On<SessionStartPayload, SessionStartResult>("hook.sessionStart",
            (_, _) => Task.FromResult<SessionStartResult?>(null));
        host.On<SessionEndPayload, object>("hook.sessionEnd", (_, _) => Task.FromResult<object?>(null));
        host.On<CommandInvokePayload, CommandInvokeResult>("command.invoke", OnCommandAsync);
    }

    private async Task<PreToolUseResult?> OnPreToolUseAsync(PreToolUsePayload payload, CancellationToken ct)
    {
        var commandText = ExtractCommandText(payload.ToolName, payload.ToolArgs);
        if (commandText is null) return null; // kein Shell-Kommando ⇒ kein Votum

        var decisions = new List<PolicyDecision>();
        foreach (var argv in ShellCommandParser.Parse(commandText))
        {
            decisions.Add(GitGuardrails.Evaluate(argv, policy));
            decisions.Add(ToolGuardian.Evaluate(argv, Environment.GetEnvironmentVariable("MKC_CWD") ?? Environment.CurrentDirectory));
            decisions.Add(BranchNameLint.Evaluate(argv));
        }
        var secrets = SecretScanner.Scan(commandText);
        if (secrets.Count > 0)
            decisions.Add(PolicyDecision.Deny("secret-in-args",
                $"Mögliches Secret in den Argumenten: {string.Join(", ", secrets.Select(s => s.Kind))}."));

        var decision = PolicyDecision.Strictest(decisions);
        return decision.Verdict switch
        {
            Verdict.Allow => null,
            Verdict.Deny => DenyResult(payload, commandText, decision, auto: true),
            Verdict.Confirm => await ResolveConfirmAsync(payload, commandText, decision, ct),
            _ => null,
        };
    }

    private async Task<PreToolUseResult> ResolveConfirmAsync(
        PreToolUsePayload payload, string commandText, PolicyDecision decision, CancellationToken ct)
    {
        var mode = modeContract.Read();
        if (mode != SessionMode.Interactive)
            return DenyResult(payload, commandText,
                decision with { Verdict = Verdict.Deny, Reason = $"[GATE] nur interaktiv: {decision.Reason}" }, auto: true);

        var answer = _host is null
            ? null
            : await _host.RequestAsync<UiConfirmRequest, UiConfirmResult>(
                "ui.confirm",
                new UiConfirmRequest("mkc-work-guardian", $"{decision.Reason}\n\nBefehl: {commandText}\nZulassen?",
                    (int)Timeouts.ConfirmDeadline.TotalMilliseconds),
                Timeouts.ConfirmDeadline + TimeSpan.FromSeconds(5), ct);

        if (answer is { Confirmed: true })
            return new PreToolUseResult { PermissionDecision = "allow" };

        // Keine/negative Antwort oder Timeout ⇒ deny (Confirm-Deadline, Mechanik 4)
        return DenyResult(payload, commandText, decision with { Verdict = Verdict.Deny }, auto: answer is null);
    }

    private PreToolUseResult DenyResult(PreToolUsePayload payload, string commandText, PolicyDecision decision, bool auto)
    {
        var digest = DenyLog.Digest(commandText);
        _denyLog.Append(new DenyEntry(DateTimeOffset.UtcNow, ExtensionName, decision.Rule,
            payload.ToolName, digest, modeContract.Read().ToString().ToLowerInvariant(), auto));

        var repeated = _denyLog.ReadAll().TakeLast(3).Count(d => d.ArgsDigest == digest);
        var escalation = repeated >= 3
            ? " STOP: Dieser Befehl wurde bereits mehrfach verweigert — er ist policy-blockiert. Wähle einen anderen Weg."
            : "";
        // Adaptive Policy: konkreten Ausweg vorschlagen statt nur zu blockieren.
        var alternative = Alternatives.GetValueOrDefault(decision.Rule);
        var hint = alternative is null ? "" : $" Alternative: {alternative}";

        return new PreToolUseResult
        {
            PermissionDecision = "deny",
            PermissionDecisionReason = $"[{decision.Rule}] {decision.Reason}",
            AdditionalContext = $"mkc-work-guardian: '{Truncate(commandText, 120)}' verweigert ({decision.Rule}).{hint}{escalation}",
        };
    }

    /// <summary>Regel → konkreter erlaubter Ausweg (adaptive Policy-Hinweise).</summary>
    private static readonly IReadOnlyDictionary<string, string> Alternatives = new Dictionary<string, string>
    {
        ["git-push-force"] = "git push --force-with-lease (verliert keine fremden Commits).",
        ["git-push-force-protected"] = "auf einem Feature-Branch arbeiten und per PR mergen statt main zu forcen.",
        ["git-push-lease-protected"] = "auf einem Feature-Branch arbeiten und per PR mergen statt den geschützten Branch zu forcen.",
        ["git-reset-hard"] = "git stash (reversibel) oder ein Checkpoint via /checkpoint create vor dem Reset.",
        ["git-clean-force"] = "git clean -n (Dry-Run) zeigt erst, was gelöscht würde.",
        ["git-branch-force-delete"] = "git branch -d (nur gemergte) oder den Branch vorher pushen/sichern.",
        ["git-rebase-shared"] = "auf einem eigenen Branch rebasen, geteilte Branches nur mergen.",
        ["secret-in-args"] = "Secret über ${env:NAME}/${secret:NAME} referenzieren statt im Klartext.",
        ["insecure-http"] = "https:// verwenden.",
        ["branch-name-lint"] = "git-flow-Schema nutzen: feature/ab1234-kurz-beschreibung.",
    };

    private Task<PostToolUseResult?> OnPostToolUseAsync(PostToolUsePayload payload, CancellationToken ct)
    {
        var text = payload.Result?.ToString() ?? "";
        var findings = SecretScanner.Scan(text);
        return Task.FromResult<PostToolUseResult?>(findings.Count == 0
            ? null
            : new PostToolUseResult(
                $"⚠️ mkc-work-guardian: Tool-Output enthält mögliche Secrets ({string.Join(", ", findings.Select(f => f.Kind))}) — nicht weiterverwenden, Quelle bereinigen."));
    }

    private Task<CommandInvokeResult?> OnCommandAsync(CommandInvokePayload payload, CancellationToken ct)
    {
        var sub = payload.Args.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "status";
        var text = sub switch
        {
            "why" => _denyLog.Last() is { } last
                ? $"Letzter Deny: Regel `{last.Rule}` · Tool {last.Tool} · {last.Ts:u} · Modus {last.Mode} · {(last.Auto ? "automatisch" : "nach Dialog")}"
                : "Noch kein Deny in diesem Projekt.",
            "policy" => $"Geschützte Branches: {string.Join(", ", policy.ProtectedBranches)} · Prefixe: {string.Join(", ", policy.ProtectedBranchPrefixes)}\n"
                        + "Hard-Deny: push --force (ohne lease) · clean -fd · branch -D · filter-branch/-repo · update-ref -d · reflog delete\n"
                        + "Confirm: reset --hard · checkout/switch -f · stash drop/clear · rm -rf (im Projekt) · Paket-Publish · Branch-Lint",
            _ => $"mkc-work-guardian aktiv · Modus: {modeContract.Read()} · Denies gesamt: {_denyLog.ReadAll().Count()}",
        };
        return Task.FromResult<CommandInvokeResult?>(new CommandInvokeResult(text));
    }

    private static string? ExtractCommandText(string toolName, JsonElement toolArgs)
    {
        if (toolArgs.ValueKind != JsonValueKind.Object) return null;
        if (toolArgs.TryGetProperty("command", out var cmd) && cmd.ValueKind == JsonValueKind.String)
            return cmd.GetString();
        return DefaultPolicy.ShellTools.Contains(toolName) && toolArgs.TryGetProperty("cmd", out var alt)
            ? alt.GetString()
            : null;
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
