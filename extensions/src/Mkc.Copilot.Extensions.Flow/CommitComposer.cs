using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Flow;

/// <summary>
/// Baut eine Conventional-Commit-Nachricht aus dem staged Diff + optionaler AB#-Referenz.
/// Der Typ wird heuristisch aus den geänderten Pfaden abgeleitet (deterministisch).
/// </summary>
public static class CommitComposer
{
    public static async Task<string> ComposeAsync(string cwd, string? adoRef, CancellationToken ct)
    {
        var staged = await GitRunner.RunAsync(cwd, ["diff", "--cached", "--name-only"], ct);
        var files = staged.StdOut.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (files.Length == 0) return "Keine gestagten Änderungen — nichts zu committen.";

        var type = InferType(files);
        var scope = InferScope(files);
        var scopePart = scope is null ? "" : $"({scope})";
        var subject = $"{type}{scopePart}: <kurze Beschreibung>";
        var footer = adoRef is not null ? $"\n\nRef: {adoRef}" : "";
        var body = $"# {files.Length} Datei(en):\n" + string.Join("\n", files.Take(10).Select(f => $"#   {f}"));
        return $"{subject}{footer}\n\n{body}\n#\n# Betreff anpassen; Body-Kommentarzeilen (#) werden ignoriert.";
    }

    private static string InferType(string[] files)
    {
        if (files.All(f => f.Contains("/test", StringComparison.OrdinalIgnoreCase) || f.Contains(".Tests"))) return "test";
        if (files.All(f => f.EndsWith(".md") || f.StartsWith("docs/"))) return "docs";
        if (files.Any(f => f.Contains("fix", StringComparison.OrdinalIgnoreCase))) return "fix";
        return "feat";
    }

    private static string? InferScope(string[] files)
    {
        var top = files
            .Select(f => f.Split('/').FirstOrDefault())
            .Where(s => !string.IsNullOrEmpty(s))
            .GroupBy(s => s)
            .OrderByDescending(g => g.Count())
            .FirstOrDefault()?.Key;
        return top is "src" or "." ? null : top;
    }
}
