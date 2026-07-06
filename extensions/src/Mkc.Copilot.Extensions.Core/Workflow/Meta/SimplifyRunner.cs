using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow.Meta;

public sealed record SimplifyFile(string Path, bool RolledBack, string Reason);
public sealed record SimplifyReport(List<SimplifyFile> Files)
{
    public int Simplified => Files.Count(f => !f.RolledBack);
    public int RolledBack => Files.Count(f => f.RolledBack);
}

/// <summary>
/// Deterministischer Vereinfachungs-Pass: sammelt die geänderten Dateien des aktuellen Diffs.
/// Der Head lässt das LLM je Datei eng vereinfachen; danach Gate TestsGreen — schlägt es fehl,
/// wird NUR diese Datei aus dem Checkpoint zurückgeholt (RestoreFileAsync).
/// </summary>
public sealed class SimplifyRunner(string workingDir)
{
    public async Task<IReadOnlyList<string>> ChangedFilesAsync(CancellationToken ct)
    {
        var diff = await GitRunner.RunAsync(workingDir, ["diff", "--name-only"], ct);
        var staged = await GitRunner.RunAsync(workingDir, ["diff", "--cached", "--name-only"], ct);
        return diff.StdOut.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Concat(staged.StdOut.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            .Distinct()
            .ToList();
    }
}
