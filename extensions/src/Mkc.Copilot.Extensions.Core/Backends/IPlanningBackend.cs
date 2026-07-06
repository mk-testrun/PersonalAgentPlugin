namespace Mkc.Copilot.Extensions.Core.Backends;

public sealed record TicketRef(string Id, string Title, string Status, string? Url);
public sealed record DocRef(string Id, string Title, string? Url);

/// <summary>
/// Backend-agnostische Fassade für Planung/Doku. Das LLM sieht in beiden Modi dieselben Tools —
/// local (Dateien) und remote (ADO/Confluence REST) implementieren dieses Interface.
/// </summary>
public interface IPlanningBackend
{
    string Name { get; }
    Task<TicketRef> CreateTicketAsync(string id, string title, string body, CancellationToken ct);
    Task<TicketRef?> GetTicketAsync(string id, CancellationToken ct);
    Task UpdateStatusAsync(string id, string status, CancellationToken ct);
    Task<string> ReadPlanAsync(string id, CancellationToken ct);
    Task WritePlanAsync(string id, string body, CancellationToken ct);
    Task<DocRef> DraftDocAsync(string id, string title, string markdown, CancellationToken ct);
    Task<DocRef> PublishDocAsync(string id, string title, string markdown, CancellationToken ct);
}
