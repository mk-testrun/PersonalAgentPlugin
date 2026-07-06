using System.Text;

namespace Mkc.Copilot.Extensions.Core.Backends;

/// <summary>
/// Dateibasiertes Backend: .copilot/planning/&lt;id&gt;/{plan.md, notes.md}.
/// Status im YAML-Front-Matter. Keine Netzwerkaufrufe.
/// </summary>
public sealed class LocalBackend(string cwd) : IPlanningBackend
{
    public string Name => "local";

    private string Dir(string id) => Path.Combine(cwd, ".copilot", "planning", id);
    private string PlanPath(string id) => Path.Combine(Dir(id), "plan.md");
    private string NotesPath(string id) => Path.Combine(Dir(id), "notes.md");

    public Task<TicketRef> CreateTicketAsync(string id, string title, string body, CancellationToken ct)
    {
        Directory.CreateDirectory(Dir(id));
        var content = BuildFrontMatter(id, title, "todo", null) + "\n" + body + "\n";
        File.WriteAllText(PlanPath(id), content);
        return Task.FromResult(new TicketRef(id, title, "todo", $"file://{PlanPath(id)}"));
    }

    public Task<TicketRef?> GetTicketAsync(string id, CancellationToken ct)
    {
        if (!File.Exists(PlanPath(id))) return Task.FromResult<TicketRef?>(null);
        var (fm, _) = SplitFrontMatter(File.ReadAllText(PlanPath(id)));
        return Task.FromResult<TicketRef?>(new TicketRef(id,
            fm.GetValueOrDefault("title", id), fm.GetValueOrDefault("status", "todo"), $"file://{PlanPath(id)}"));
    }

    public Task UpdateStatusAsync(string id, string status, CancellationToken ct)
    {
        if (!File.Exists(PlanPath(id))) return Task.CompletedTask;
        var (fm, body) = SplitFrontMatter(File.ReadAllText(PlanPath(id)));
        fm["status"] = status;
        File.WriteAllText(PlanPath(id), RebuildFrontMatter(fm) + "\n" + body);
        return Task.CompletedTask;
    }

    public Task<string> ReadPlanAsync(string id, CancellationToken ct)
    {
        if (!File.Exists(PlanPath(id))) return Task.FromResult("");
        var (_, body) = SplitFrontMatter(File.ReadAllText(PlanPath(id)));
        return Task.FromResult(body);
    }

    public Task WritePlanAsync(string id, string body, CancellationToken ct)
    {
        Directory.CreateDirectory(Dir(id));
        var fm = File.Exists(PlanPath(id))
            ? SplitFrontMatter(File.ReadAllText(PlanPath(id))).FrontMatter
            : new Dictionary<string, string> { ["id"] = id, ["status"] = "doing" };
        File.WriteAllText(PlanPath(id), RebuildFrontMatter(fm) + "\n" + body + "\n");
        return Task.CompletedTask;
    }

    public Task<DocRef> DraftDocAsync(string id, string title, string markdown, CancellationToken ct)
    {
        Directory.CreateDirectory(Dir(id));
        File.WriteAllText(NotesPath(id), $"# {title}\n\n{markdown}\n");
        return Task.FromResult(new DocRef(id, title, $"file://{NotesPath(id)}"));
    }

    public Task<DocRef> PublishDocAsync(string id, string title, string markdown, CancellationToken ct)
    {
        // Local „publish" = Draft in docs/ kopieren.
        var docsDir = Path.Combine(cwd, "docs");
        Directory.CreateDirectory(docsDir);
        var target = Path.Combine(docsDir, $"{id}.md");
        File.WriteAllText(target, $"# {title}\n\n{markdown}\n");
        return Task.FromResult(new DocRef(id, title, $"file://{target}"));
    }

    // ---- Front-Matter-Helfer ----

    private static string BuildFrontMatter(string id, string title, string status, string? ado)
    {
        var fm = new Dictionary<string, string> { ["id"] = id, ["title"] = title, ["status"] = status };
        if (ado is not null) fm["ado"] = ado;
        return RebuildFrontMatter(fm);
    }

    private static string RebuildFrontMatter(Dictionary<string, string> fm)
    {
        var sb = new StringBuilder("---\n");
        foreach (var (k, v) in fm) sb.Append(k).Append(": ").Append(v).Append('\n');
        sb.Append("---\n");
        return sb.ToString();
    }

    public static (Dictionary<string, string> FrontMatter, string Body) SplitFrontMatter(string content)
    {
        var fm = new Dictionary<string, string>();
        if (!content.StartsWith("---", StringComparison.Ordinal)) return (fm, content);
        var end = content.IndexOf("\n---", 3, StringComparison.Ordinal);
        if (end < 0) return (fm, content);
        foreach (var line in content[3..end].Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var colon = line.IndexOf(':');
            if (colon > 0) fm[line[..colon].Trim()] = line[(colon + 1)..].Trim();
        }
        var bodyStart = content.IndexOf('\n', end + 4);
        return (fm, bodyStart < 0 ? "" : content[(bodyStart + 1)..]);
    }
}
