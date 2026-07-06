namespace Mkc.Copilot.Extensions.Core.State;

public sealed record Checkpoint(int Number, string Sha, string? PatchFile, DateTimeOffset CreatedAt, string Label);

public sealed record CheckpointIndex(List<Checkpoint> Checkpoints);

/// <summary>
/// Checkpoints ohne Working-Tree-Berührung: `git stash create` liefert ein Commit-Objekt,
/// der Diff wird als Patch ins State-Verzeichnis gelegt. Restore je Datei über
/// `git checkout &lt;sha&gt; -- &lt;file&gt;`.
/// </summary>
public sealed class Checkpointer(StateStore store, string workingDir)
{
    private const string IndexFile = "checkpoints.json";

    public async Task<Checkpoint> CreateAsync(string label, CancellationToken ct)
    {
        var index = store.ReadJson<CheckpointIndex>(IndexFile) ?? new CheckpointIndex([]);
        var number = index.Checkpoints.Count + 1;

        var stash = await GitRunner.RunAsync(workingDir, ["stash", "create", $"mkc-checkpoint-{number}"], ct);
        var sha = stash.Success && stash.StdOut.Length > 0
            ? stash.StdOut
            : (await GitRunner.RunAsync(workingDir, ["rev-parse", "HEAD"], ct)).StdOut; // Working Tree sauber ⇒ HEAD

        string? patchFile = null;
        var diff = await GitRunner.RunAsync(workingDir, ["diff"], ct);
        if (diff.Success && diff.StdOut.Length > 0)
        {
            patchFile = store.PathFor(Path.Combine("checkpoints", $"checkpoint-{number}.patch"));
            await File.WriteAllTextAsync(patchFile, diff.StdOut + "\n", ct);
        }

        var checkpoint = new Checkpoint(number, sha, patchFile, DateTimeOffset.UtcNow, label);
        index.Checkpoints.Add(checkpoint);
        store.WriteJson(IndexFile, index);
        return checkpoint;
    }

    public IReadOnlyList<Checkpoint> List() =>
        (store.ReadJson<CheckpointIndex>(IndexFile) ?? new CheckpointIndex([])).Checkpoints;

    /// <summary>Holt eine einzelne Datei aus einem Checkpoint zurück (SimplifyRunner-Rollback).</summary>
    public Task<GitResult> RestoreFileAsync(Checkpoint checkpoint, string relativePath, CancellationToken ct) =>
        GitRunner.RunAsync(workingDir, ["checkout", checkpoint.Sha, "--", relativePath], ct);
}
