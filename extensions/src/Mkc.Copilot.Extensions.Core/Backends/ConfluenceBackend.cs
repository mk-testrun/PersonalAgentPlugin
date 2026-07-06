using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Pii;

namespace Mkc.Copilot.Extensions.Core.Backends;

/// <summary>
/// Confluence-Cloud-Backend (REST v2). Draft und Publish erzeugen/aktualisieren Seiten;
/// Markdown wird in Storage-Format konvertiert. spaceId wird einmalig aufgelöst und im
/// Aufrufer (SyncEngine/links.json) gecacht.
/// </summary>
public sealed class ConfluenceBackend(RestClient client, RemoteConfig config, PiiScrubber pii) : IPlanningBackend
{
    public string Name => "confluence";

    private string ApiV2 => $"{config.ConfluenceBaseUrl}/api/v2";

    // Planung liegt bei ADO — Confluence ist reines Doku-Ziel.
    public Task<TicketRef> CreateTicketAsync(string id, string title, string body, CancellationToken ct)
        => throw new NotSupportedException("Confluence ist Doku-Ziel, kein Ticket-Backend.");
    public Task<TicketRef?> GetTicketAsync(string id, CancellationToken ct) => Task.FromResult<TicketRef?>(null);
    public Task UpdateStatusAsync(string id, string status, CancellationToken ct) => Task.CompletedTask;
    public Task<string> ReadPlanAsync(string id, CancellationToken ct) => Task.FromResult("");
    public Task WritePlanAsync(string id, string body, CancellationToken ct) => Task.CompletedTask;

    public async Task<DocRef> DraftDocAsync(string id, string title, string markdown, CancellationToken ct)
        => await UpsertAsync(id, title, markdown, publish: false, ct);

    public async Task<DocRef> PublishDocAsync(string id, string title, string markdown, CancellationToken ct)
        => await UpsertAsync(id, title, markdown, publish: true, ct);

    private async Task<DocRef> UpsertAsync(string id, string title, string markdown, bool publish, CancellationToken ct)
    {
        var spaceId = await ResolveSpaceIdAsync(ct);
        var storage = MarkdownToStorage(pii.Scrub(markdown).Text);
        var body = new
        {
            spaceId,
            status = publish ? "current" : "draft",
            title = pii.Scrub(title).Text,
            body = new { representation = "storage", value = storage },
        };
        var json = await client.SendJsonAsync(HttpMethod.Post, $"{ApiV2}/pages", body, "application/json", ct);
        var pageId = json.TryGetProperty("id", out var pid) ? pid.GetString() ?? pid.GetRawText() : "?";
        return new DocRef(pageId, title, $"{config.ConfluenceBaseUrl}/pages/{pageId}");
    }

    private async Task<string> ResolveSpaceIdAsync(CancellationToken ct)
    {
        var json = await client.GetAsync($"{ApiV2}/spaces?keys={config.ConfluenceSpace}", ct);
        if (json.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
            return results[0].GetProperty("id").GetRawText().Trim('"');
        throw new InvalidOperationException($"Confluence-Space '{config.ConfluenceSpace}' nicht gefunden.");
    }

    /// <summary>Minimaler Markdown→Confluence-Storage-Konverter: h1-h4, p, ul/ol, code, a.</summary>
    public static string MarkdownToStorage(string markdown)
    {
        var sb = new System.Text.StringBuilder();
        var inCode = false;
        var inList = false;
        foreach (var raw in markdown.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw;
            if (line.StartsWith("```", StringComparison.Ordinal))
            {
                if (!inCode) { sb.Append("<ac:structured-macro ac:name=\"code\"><ac:plain-text-body><![CDATA["); inCode = true; }
                else { sb.Append("]]></ac:plain-text-body></ac:structured-macro>"); inCode = false; }
                continue;
            }
            // Code steht in CDATA und darf NICHT escaped werden; nur die CDATA-Endsequenz aufbrechen.
            if (inCode) { sb.Append(line.Replace("]]>", "]]]]><![CDATA[>")).Append('\n'); continue; }

            if (line.StartsWith("- ", StringComparison.Ordinal))
            {
                if (!inList) { sb.Append("<ul>"); inList = true; }
                sb.Append("<li>").Append(Inline(line[2..])).Append("</li>");
                continue;
            }
            if (inList) { sb.Append("</ul>"); inList = false; }

            if (line.StartsWith("#### ", StringComparison.Ordinal)) sb.Append("<h4>").Append(Inline(line[5..])).Append("</h4>");
            else if (line.StartsWith("### ", StringComparison.Ordinal)) sb.Append("<h3>").Append(Inline(line[4..])).Append("</h3>");
            else if (line.StartsWith("## ", StringComparison.Ordinal)) sb.Append("<h2>").Append(Inline(line[3..])).Append("</h2>");
            else if (line.StartsWith("# ", StringComparison.Ordinal)) sb.Append("<h1>").Append(Inline(line[2..])).Append("</h1>");
            else if (line.Trim().Length > 0) sb.Append("<p>").Append(Inline(line)).Append("</p>");
        }
        if (inList) sb.Append("</ul>");
        if (inCode) sb.Append("]]></ac:plain-text-body></ac:structured-macro>");
        return sb.ToString();
    }

    private static string Inline(string text)
    {
        text = Escape(text);
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\[([^\]]+)\]\(([^)]+)\)", "<a href=\"$2\">$1</a>");
        text = System.Text.RegularExpressions.Regex.Replace(text, @"`([^`]+)`", "<code>$1</code>");
        return text;
    }

    private static string Escape(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
