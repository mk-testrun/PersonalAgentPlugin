namespace Mkc.Copilot.Extensions.Core.Workflow;

public enum StepStatus { Open, Doing, Done, Skipped }

/// <summary>Persistierter Zustand einer Workflow-Instanz (workflows/&lt;id&gt;.json).</summary>
public sealed record WorkflowState
{
    public required string Id { get; init; }
    public required string Definition { get; init; }
    public required string Title { get; init; }
    public string CurrentStep { get; set; } = "";
    public Dictionary<string, string> StepStatus { get; init; } = new();   // stepId → Open|Doing|Done|Skipped
    public Dictionary<string, string> SkipReasons { get; init; } = new();
    public List<StepMeta> AdHocSteps { get; init; } = [];                   // via /workflow add eingeschoben
    public string? Ado { get; set; }
    public string? Confluence { get; set; }
    public string Backend { get; set; } = "local";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
