using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow;

public sealed record GateResult(bool Passed, string Detail);

/// <summary>
/// Deterministische Gate-Prüfungen: NUR Exit-Codes/Dateisystem/git — nie Modelltext.
/// Registry ist erweiterbar; Aufrufer registriert projektspezifische Checks.
/// </summary>
public sealed class Gates(string workingDir)
{
    private readonly Dictionary<string, Func<CancellationToken, Task<GateResult>>> _checks = new();

    public Gates()
        : this(Environment.GetEnvironmentVariable("MKC_CWD") ?? Environment.CurrentDirectory)
    {
        Register("HasCommits", HasCommitsAsync);
        Register("BranchConform", BranchConformAsync);
        Register("TestsGreen", TestsGreenAsync);
        Register("HasStagedChanges", HasStagedChangesAsync);
    }

    public void Register(string name, Func<CancellationToken, Task<GateResult>> check) => _checks[name] = check;

    public async Task<GateResult> EvaluateAsync(string name, CancellationToken ct)
    {
        if (!_checks.TryGetValue(name, out var check))
            return new GateResult(true, $"(unbekanntes Gate {name} — übersprungen)");
        try { return await check(ct); }
        catch (Exception ex) { return new GateResult(false, $"Gate-Fehler: {ex.Message}"); }
    }

    public async Task<IReadOnlyList<(string Gate, GateResult Result)>> EvaluateAllAsync(IEnumerable<string> gates, CancellationToken ct)
    {
        var results = new List<(string, GateResult)>();
        foreach (var g in gates) results.Add((g, await EvaluateAsync(g, ct)));
        return results;
    }

    private async Task<GateResult> HasCommitsAsync(CancellationToken ct)
    {
        var head = await GitRunner.RunAsync(workingDir, ["rev-parse", "--abbrev-ref", "HEAD"], ct);
        var upstream = await GitRunner.RunAsync(workingDir, ["rev-list", "--count", "@{u}..HEAD"], ct);
        var ahead = upstream.Success && int.TryParse(upstream.StdOut, out var n) && n > 0;
        var localCommits = await GitRunner.RunAsync(workingDir, ["log", "--oneline", "-1"], ct);
        return new GateResult(ahead || localCommits.Success, ahead ? $"{upstream.StdOut} Commits vor Upstream" : "Commits vorhanden");
    }

    private async Task<GateResult> BranchConformAsync(CancellationToken ct)
    {
        var branch = (await GitRunner.RunAsync(workingDir, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).StdOut;
        var ok = Policy.BranchNameLint.IsConform(branch) || branch is "main" or "master" or "develop";
        return new GateResult(ok, ok ? $"Branch '{branch}' konform" : $"Branch '{branch}' nicht git-flow-konform");
    }

    private async Task<GateResult> TestsGreenAsync(CancellationToken ct)
    {
        var marker = Path.Combine(workingDir, ".copilot", "state", "extensions", "mkc", "last-test-exit");
        if (File.Exists(marker) && (await File.ReadAllTextAsync(marker, ct)).Trim() == "0")
            return new GateResult(true, "Letzter Testlauf grün (Marker)");
        return new GateResult(false, "Kein grüner Testlauf registriert — 'dotnet test' ausführen.");
    }

    private async Task<GateResult> HasStagedChangesAsync(CancellationToken ct)
    {
        var diff = await GitRunner.RunAsync(workingDir, ["diff", "--cached", "--name-only"], ct);
        var has = diff.Success && diff.StdOut.Length > 0;
        return new GateResult(has, has ? "Staged changes vorhanden" : "Nichts gestaged");
    }
}
