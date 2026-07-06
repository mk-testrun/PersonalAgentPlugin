using System.Diagnostics;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow.Meta;

public sealed record GoalCheck(string Cmd, int ExpectExit);
public sealed record Goal(string Text, List<GoalCheck> Checks);
public sealed record CheckResult(string Cmd, bool Passed, int ExitCode);

/// <summary>
/// Persistiertes Ziel mit PRÜFBAREN Akzeptanz-Checks (Kommandos + Erwartungs-Exit-Code).
/// Das Ziel driftet nicht weg, weil es außerhalb des Kontextfensters liegt.
/// </summary>
public sealed class GoalTracker(StateStore store, string workingDir)
{
    private const string FileName = "goal.json";

    public Goal? Current => store.ReadJson<Goal>(FileName);

    public void Set(string text, IEnumerable<GoalCheck> checks)
        => store.WriteJson(FileName, new Goal(text, checks.ToList()));

    public void Clear() => store.WriteJson(FileName, new Goal("", []));

    public async Task<IReadOnlyList<CheckResult>> EvaluateAsync(CancellationToken ct)
    {
        var goal = Current;
        if (goal is null || goal.Checks.Count == 0) return [];
        var results = new List<CheckResult>();
        foreach (var check in goal.Checks)
        {
            var exit = await RunAsync(check.Cmd, ct);
            results.Add(new CheckResult(check.Cmd, exit == check.ExpectExit, exit));
        }
        return results;
    }

    public async Task<bool> AllGreenAsync(CancellationToken ct)
    {
        var results = await EvaluateAsync(ct);
        return results.Count > 0 && results.All(r => r.Passed);
    }

    private async Task<int> RunAsync(string command, CancellationToken ct)
    {
        var psi = new ProcessStartInfo("/bin/bash")
        {
            WorkingDirectory = workingDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        psi.ArgumentList.Add("-c");
        psi.ArgumentList.Add(command);
        try
        {
            using var proc = Process.Start(psi)!;
            await proc.WaitForExitAsync(ct).ConfigureAwait(false);
            return proc.ExitCode;
        }
        catch (OperationCanceledException) { throw; }
        catch { return -1; }
    }
}
