namespace Mkc.Copilot.Extensions.Core.Workflow;

public enum StepKind { Planning, Git, Dev, Quality, Release, Doc, Security, Meta }

/// <summary>
/// Deklarative Beschreibung eines Workflow-Steps. Metadaten steuern, was übersprungen,
/// eingeschoben und im Autopilot erlaubt ist (Ausführungsplan §5.2).
/// </summary>
public sealed record StepMeta
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public StepKind Kind { get; init; } = StepKind.Dev;
    public bool Optional { get; init; }
    public bool Skippable { get; init; }
    public bool AutopilotAllowed { get; init; } = true;
    public string[] Gates { get; init; } = [];        // Namen registrierter Gate-Prüfungen
    public string[] Produces { get; init; } = [];
    public string? After { get; init; }               // DAG-Kante (Vorgänger-Step-Id)
}
