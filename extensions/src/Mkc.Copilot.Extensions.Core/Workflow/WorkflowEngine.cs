using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow;

public sealed record StepAdvanceResult(bool Advanced, string Message, string? NewStep);

/// <summary>
/// Generischer Interpreter über WorkflowDefinition: Start/Next/Skip/Add/Resume/Abort.
/// Gates entscheiden über Weiterschalten (Code, nie Modell). Zustand ist die Wahrheit.
/// </summary>
public sealed class WorkflowEngine(StateStore store, Gates gates)
{
    private const string ActivePointer = "current-workflow.json";
    private static string StatePath(string id) => Path.Combine("workflows", $"{id}.json");

    public WorkflowState Start(string definitionName, string id, string title)
    {
        var def = Definitions.All[definitionName];
        var state = new WorkflowState { Id = id, Definition = definitionName, Title = title, CurrentStep = def.Steps[0].Id };
        foreach (var s in def.Steps) state.StepStatus[s.Id] = s.Id == def.Steps[0].Id ? "Doing" : "Open";
        Save(state);
        SetActive(id);
        return state;
    }

    public WorkflowState? Load(string id) => store.ReadJson<WorkflowState>(StatePath(id));

    public string? ActiveId() => store.ReadJson<ActivePointerFile>(ActivePointer)?.Id;

    public IReadOnlyList<WorkflowState> List()
    {
        var dir = Path.Combine(store.RootDir, "workflows");
        if (!Directory.Exists(dir)) return [];
        return Directory.EnumerateFiles(dir, "*.json")
            .Select(f => store.ReadJson<WorkflowState>(Path.Combine("workflows", Path.GetFileName(f))))
            .OfType<WorkflowState>()
            .OrderByDescending(s => s.UpdatedAt)
            .ToList();
    }

    private IReadOnlyList<StepMeta> StepsOf(WorkflowState state)
    {
        var def = Definitions.All[state.Definition];
        // Ad-hoc-Steps sind bereits an korrekter Stelle in state.AdHocSteps + StepStatus reflektiert;
        // wir mergen sie nach ihrem After.
        var steps = def.Steps.ToList();
        foreach (var ad in state.AdHocSteps)
        {
            var idx = ad.After is null ? steps.Count : steps.FindIndex(s => s.Id == ad.After) + 1;
            steps.Insert(Math.Clamp(idx, 0, steps.Count), ad);
        }
        return steps;
    }

    public async Task<StepAdvanceResult> NextAsync(WorkflowState state, SessionMode mode, CancellationToken ct)
    {
        var steps = StepsOf(state);
        var current = steps.FirstOrDefault(s => s.Id == state.CurrentStep);
        if (current is null) return new StepAdvanceResult(false, "Kein aktueller Step.", null);

        var results = await gates.EvaluateAllAsync(current.Gates, ct);
        var failed = results.Where(r => !r.Result.Passed).ToList();
        if (failed.Count > 0)
            return new StepAdvanceResult(false,
                $"Step '{current.Title}' noch nicht abgeschlossen — offen: " +
                string.Join("; ", failed.Select(f => $"{f.Gate} ({f.Result.Detail})")), state.CurrentStep);

        state.StepStatus[current.Id] = "Done";
        var idx = steps.ToList().FindIndex(s => s.Id == current.Id);
        var next = steps.Skip(idx + 1).FirstOrDefault();
        if (next is null)
        {
            state.CurrentStep = "";
            Save(state);
            return new StepAdvanceResult(true, $"Workflow '{state.Title}' abgeschlossen.", null);
        }
        state.CurrentStep = next.Id;
        state.StepStatus[next.Id] = "Doing";
        Save(state);
        return new StepAdvanceResult(true, $"Weiter zu '{next.Title}'.", next.Id);
    }

    public StepAdvanceResult Skip(WorkflowState state, string? stepId, string reason, SessionMode mode)
    {
        var steps = StepsOf(state);
        var target = stepId is null ? state.CurrentStep : stepId;
        var step = steps.FirstOrDefault(s => s.Id == target);
        if (step is null) return new StepAdvanceResult(false, $"Step '{target}' unbekannt.", state.CurrentStep);
        if (!step.Skippable) return new StepAdvanceResult(false, $"Step '{step.Title}' ist nicht überspringbar.", state.CurrentStep);
        if (mode == SessionMode.Autonomous && !step.AutopilotAllowed)
            return new StepAdvanceResult(false, $"Step '{step.Title}' darf im Autopilot nicht übersprungen werden.", state.CurrentStep);

        state.StepStatus[step.Id] = "Skipped";
        state.SkipReasons[step.Id] = reason;
        if (step.Id == state.CurrentStep)
        {
            var idx = steps.ToList().FindIndex(s => s.Id == step.Id);
            var next = steps.Skip(idx + 1).FirstOrDefault();
            state.CurrentStep = next?.Id ?? "";
            if (next is not null) state.StepStatus[next.Id] = "Doing";
        }
        Save(state);
        return new StepAdvanceResult(true, $"Step '{step.Title}' übersprungen ({reason}).", state.CurrentStep);
    }

    public StepAdvanceResult Add(WorkflowState state, string title)
    {
        var id = "adhoc-" + Guid.NewGuid().ToString("n")[..6];
        var step = new StepMeta { Id = id, Title = title, Kind = StepKind.Dev, After = null, Skippable = true };
        state.AdHocSteps.Add(step with { After = InsertBefore(state) });
        state.StepStatus[id] = "Open";
        Save(state);
        return new StepAdvanceResult(true, $"Ad-hoc-Step '{title}' vor dem aktuellen Step eingeschoben.", state.CurrentStep);
    }

    /// <summary>After-Wert, der den neuen Step VOR den aktuellen setzt (also nach dessen Vorgänger).</summary>
    private string? InsertBefore(WorkflowState state)
    {
        var steps = StepsOf(state);
        var idx = steps.ToList().FindIndex(s => s.Id == state.CurrentStep);
        return idx > 0 ? steps[idx - 1].Id : null;
    }

    public void Abort(WorkflowState state)
    {
        state.CurrentStep = "";
        Save(state);
        if (ActiveId() == state.Id) store.WriteJson(ActivePointer, new ActivePointerFile(null));
    }

    public void Save(WorkflowState state)
    {
        state.UpdatedAt = DateTimeOffset.UtcNow;
        store.WriteJson(StatePath(state.Id), state);
    }

    public void SetActive(string id) => store.WriteJson(ActivePointer, new ActivePointerFile(id));

    /// <summary>Kompakter Re-Entry-Block (≤ 400 Zeichen) für sessionStart.</summary>
    public string ReentryBlock(WorkflowState state)
    {
        var steps = StepsOf(state);
        var idx = Math.Max(0, steps.ToList().FindIndex(s => s.Id == state.CurrentStep));
        var current = steps.FirstOrDefault(s => s.Id == state.CurrentStep);
        var open = current?.Gates.Length > 0 ? $" Gates: {string.Join(",", current.Gates)}." : "";
        var link = state.Ado is not null ? $" [{state.Ado}]" : "";
        var block = $"Aktiver Workflow: {state.Definition}/{state.Id} '{state.Title}'{link}, " +
                    $"Schritt {idx + 1}/{steps.Count} {(current?.Title ?? "—")}.{open} Weiter mit /workflow next.";
        return block.Length <= 400 ? block : block[..399];
    }

    public sealed record ActivePointerFile(string? Id);
}
