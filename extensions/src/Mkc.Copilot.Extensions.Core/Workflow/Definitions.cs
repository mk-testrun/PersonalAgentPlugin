namespace Mkc.Copilot.Extensions.Core.Workflow;

/// <summary>
/// Die sieben Workflow-Definitionen (Spiegel der orchestration-Plugin-Workflows, deterministisch).
/// </summary>
public static class Definitions
{
    public static readonly WorkflowDefinition Feature = WorkflowDefinition.Define("feature")
        .Step("ticket", "Ticket anlegen/verknüpfen", StepKind.Planning, autopilotAllowed: false, gates: ["TicketLinked"])
        .Step("plan", "Plan ausfüllen", StepKind.Planning, gates: ["PlanFilled"])
        .Step("branch", "Branch anlegen", StepKind.Git, gates: ["BranchConform"])
        .Step("implement", "Implementieren", StepKind.Dev, gates: ["HasCommits"])
        .Step("test", "Testen", StepKind.Quality, gates: ["TestsGreen"])
        .Step("review", "Review", StepKind.Quality, optional: true, skippable: true)
        .Step("ship", "PR/Ship", StepKind.Release, gates: ["HasCommits"])
        .Step("doc", "Dokumentieren", StepKind.Doc, optional: true, skippable: true)
        .Build();

    public static readonly WorkflowDefinition Bugfix = WorkflowDefinition.Define("bugfix")
        .Step("repro", "Reproduzieren", StepKind.Quality, gates: [])
        .Step("ticket", "Ticket verknüpfen", StepKind.Planning, autopilotAllowed: false, gates: ["TicketLinked"])
        .Step("branch", "Branch anlegen", StepKind.Git, gates: ["BranchConform"])
        .Step("fix", "Fix", StepKind.Dev, gates: ["HasCommits"])
        .Step("regression", "Regressionstest", StepKind.Quality, gates: ["TestsGreen"])
        .Step("ship", "PR/Ship", StepKind.Release, gates: ["HasCommits"])
        .Build();

    public static readonly WorkflowDefinition Doc = WorkflowDefinition.Define("doc")
        .Step("draft", "Draft schreiben", StepKind.Doc, gates: [])
        .Step("review", "Review", StepKind.Doc, optional: true, skippable: true)
        .Step("publish", "Veröffentlichen", StepKind.Doc, autopilotAllowed: false)
        .Build();

    public static readonly WorkflowDefinition Refactor = WorkflowDefinition.Define("refactor")
        .Step("scope", "Umfang festlegen", StepKind.Planning)
        .Step("branch", "Branch anlegen", StepKind.Git, gates: ["BranchConform"])
        .Step("refactor", "Umbauen", StepKind.Dev, gates: ["HasCommits"])
        .Step("test", "Testen (Verhalten unverändert)", StepKind.Quality, gates: ["TestsGreen"])
        .Step("ship", "PR/Ship", StepKind.Release, gates: ["HasCommits"])
        .Build();

    public static readonly WorkflowDefinition Review = WorkflowDefinition.Define("review")
        .Step("collect", "Diff/Änderungen sammeln", StepKind.Quality)
        .Step("assess", "Bewerten (Security/Perf/Style)", StepKind.Quality)
        .Step("report", "Report ablegen", StepKind.Doc, gates: [])
        .Build();

    public static readonly WorkflowDefinition Security = WorkflowDefinition.Define("security")
        .Step("scope", "Scope + Bedrohungsmodell", StepKind.Security)
        .Step("scan", "Secret-/Dep-Scan", StepKind.Security)
        .Step("assess", "Bewerten (OWASP ASVS)", StepKind.Security)
        .Step("remediate", "Beheben", StepKind.Dev, optional: true, gates: ["HasCommits"])
        .Step("report", "Report", StepKind.Doc)
        .Build();

    public static readonly WorkflowDefinition Release = WorkflowDefinition.Define("release")
        .Step("prepare", "Release-Branch + Version", StepKind.Release, gates: ["BranchConform"])
        .Step("changelog", "Changelog", StepKind.Doc)
        .Step("verify", "Verifizieren (Tests grün)", StepKind.Quality, gates: ["TestsGreen"])
        .Step("tag", "Taggen/Ship", StepKind.Release, autopilotAllowed: false)
        .Build();

    public static readonly IReadOnlyDictionary<string, WorkflowDefinition> All =
        new Dictionary<string, WorkflowDefinition>
        {
            ["feature"] = Feature, ["bugfix"] = Bugfix, ["doc"] = Doc, ["refactor"] = Refactor,
            ["review"] = Review, ["security"] = Security, ["release"] = Release,
        };
}
