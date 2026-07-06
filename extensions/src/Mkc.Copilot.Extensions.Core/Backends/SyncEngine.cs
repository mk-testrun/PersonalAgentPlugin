
namespace Mkc.Copilot.Extensions.Core.Backends;

public sealed record LinksFile(string? Ado, string? ConfluencePageId, string? SpaceId, DateTimeOffset? LastSync);

public enum SyncDirection { LocalToRemote, RemoteToLocal }

public sealed record SyncOutcome(bool Success, string Message, string? AdoRef = null);

/// <summary>
/// Gleicht local↔remote beim Moduswechsel ab. Idempotent über links.json (ein WorkItem,
/// nicht mehrere). Konflikte werden vom Aufrufer aufgelöst (interaktiv ui.select, autonom fail-safe lokal).
/// </summary>
public sealed class SyncEngine(string cwd, IPlanningBackend local, IPlanningBackend remote)
{
    // links.json liegt neben plan.md im Projekt (nicht im mkc-State).
    private string LinksFileFor(string id) => Path.Combine(cwd, ".copilot", "planning", id, "links.json");

    public LinksFile ReadLinks(string id)
    {
        var path = LinksFileFor(id);
        if (!File.Exists(path)) return new LinksFile(null, null, null, null);
        try { return System.Text.Json.JsonSerializer.Deserialize<LinksFile>(File.ReadAllText(path)) ?? new(null, null, null, null); }
        catch { return new LinksFile(null, null, null, null); }
    }

    public void WriteLinks(string id, LinksFile links)
    {
        var path = LinksFileFor(id);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(links, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
    }

    /// <summary>local→remote: legt WorkItem an, falls noch nicht verknüpft (idempotent).</summary>
    public async Task<SyncOutcome> PushAsync(string id, string title, CancellationToken ct)
    {
        var links = ReadLinks(id);
        if (links.Ado is not null)
        {
            var plan = await local.ReadPlanAsync(id, ct);
            await remote.WritePlanAsync(links.Ado, plan, ct);
            return new SyncOutcome(true, $"WorkItem {links.Ado} aktualisiert.", links.Ado);
        }
        var plan2 = await local.ReadPlanAsync(id, ct);
        var ticket = await remote.CreateTicketAsync(id, title, plan2, ct);
        WriteLinks(id, links with { Ado = ticket.Id, LastSync = DateTimeOffset.UtcNow });
        return new SyncOutcome(true, $"WorkItem {ticket.Id} angelegt: {ticket.Url}", ticket.Id);
    }

    /// <summary>remote→local: zieht WorkItem-Beschreibung als Snapshot in plan.md.</summary>
    public async Task<SyncOutcome> PullAsync(string id, CancellationToken ct)
    {
        var links = ReadLinks(id);
        if (links.Ado is null) return new SyncOutcome(false, "Keine Remote-Verknüpfung — nichts zu ziehen.");
        var body = await remote.ReadPlanAsync(links.Ado, ct);
        await local.WritePlanAsync(id, body, ct);
        WriteLinks(id, links with { LastSync = DateTimeOffset.UtcNow });
        return new SyncOutcome(true, $"Snapshot von {links.Ado} nach plan.md gezogen.", links.Ado);
    }
}
