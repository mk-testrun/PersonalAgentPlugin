using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Pii;

namespace Mkc.Copilot.Extensions.Core.Backends;

/// <summary>
/// Azure-DevOps-Backend über REST 7.1 (WorkItems + Pull Requests). PII wird vor jedem
/// Request gescrubbt, Antworten werden zu kompakten Digests reduziert (Token-Sparsamkeit).
/// Ticket-Ids sind ADO-WorkItem-Ids; unser Workflow-Id-Mapping lebt in links.json (SyncEngine).
/// </summary>
public sealed class AdoBackend(RestClient client, RemoteConfig config, PiiScrubber pii) : IPlanningBackend
{
    public string Name => "ado";

    private string WorkItemsBase => $"{config.AdoOrgUrl}/{config.AdoProject}/_apis/wit/workitems";
    private string Api => $"?api-version={config.AdoApiVersion}";

    public async Task<TicketRef> CreateTicketAsync(string id, string title, string body, CancellationToken ct)
    {
        var patch = new object[]
        {
            new { op = "add", path = "/fields/System.Title", value = pii.Scrub(title).Text },
            new { op = "add", path = "/fields/System.Description", value = pii.Scrub(body).Text },
        };
        var json = await client.SendJsonAsync(HttpMethod.Post, $"{WorkItemsBase}/$Task{Api}",
            JsonSerializer.Serialize(patch), "application/json-patch+json", ct);
        return ToTicket(json);
    }

    public async Task<TicketRef?> GetTicketAsync(string id, CancellationToken ct)
    {
        try { return ToTicket(await client.GetAsync($"{WorkItemsBase}/{WorkItemId(id)}{Api}", ct)); }
        catch (HttpRequestException) { return null; }
    }

    public async Task UpdateStatusAsync(string id, string status, CancellationToken ct)
    {
        var state = MapStatus(status);
        var patch = new object[] { new { op = "add", path = "/fields/System.State", value = state } };
        await client.SendJsonAsync(HttpMethod.Patch, $"{WorkItemsBase}/{WorkItemId(id)}{Api}",
            JsonSerializer.Serialize(patch), "application/json-patch+json", ct);
    }

    public async Task<string> ReadPlanAsync(string id, CancellationToken ct)
    {
        var json = await client.GetAsync($"{WorkItemsBase}/{WorkItemId(id)}{Api}", ct);
        return json.TryGetProperty("fields", out var f) && f.TryGetProperty("System.Description", out var d)
            ? d.GetString() ?? "" : "";
    }

    public Task WritePlanAsync(string id, string body, CancellationToken ct)
    {
        var patch = JsonSerializer.Serialize(new object[]
        {
            new { op = "add", path = "/fields/System.Description", value = pii.Scrub(body).Text },
        });
        return client.SendJsonAsync(HttpMethod.Patch, $"{WorkItemsBase}/{WorkItemId(id)}{Api}",
            patch, "application/json-patch+json", ct);
    }

    // Doku gehört zu Confluence — im ADO-Backend nicht unterstützt (SyncEngine wählt Confluence).
    public Task<DocRef> DraftDocAsync(string id, string title, string markdown, CancellationToken ct)
        => throw new NotSupportedException("ADO-Backend hat kein Doku-Ziel — Confluence nutzen.");
    public Task<DocRef> PublishDocAsync(string id, string title, string markdown, CancellationToken ct)
        => throw new NotSupportedException("ADO-Backend hat kein Doku-Ziel — Confluence nutzen.");

    private TicketRef ToTicket(JsonElement json)
    {
        var wid = json.TryGetProperty("id", out var idEl) ? idEl.GetRawText() : "?";
        var fields = json.TryGetProperty("fields", out var f) ? f : default;
        var title = fields.ValueKind == JsonValueKind.Object && fields.TryGetProperty("System.Title", out var t)
            ? t.GetString() ?? "" : "";
        var state = fields.ValueKind == JsonValueKind.Object && fields.TryGetProperty("System.State", out var st)
            ? st.GetString() ?? "New" : "New";
        return new TicketRef($"AB#{wid}", title, state, $"{config.AdoOrgUrl}/{config.AdoProject}/_workitems/edit/{wid}");
    }

    private static string WorkItemId(string id) => id.Replace("AB#", "").Replace("ab", "").Trim();

    private static string MapStatus(string status) => status.ToLowerInvariant() switch
    {
        "todo" => "New", "doing" => "Active", "done" => "Closed", _ => "Active",
    };
}
