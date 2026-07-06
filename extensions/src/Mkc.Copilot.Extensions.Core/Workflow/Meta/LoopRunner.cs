using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow.Meta;

public enum LoopVerdict { Continue, StopGoalReached, StopMaxIterations, StopNoProgress, StopBudget, Inactive }

public sealed record LoopState
{
    public bool Active { get; set; }
    public int Iteration { get; set; }
    public int MaxIterations { get; set; } = 5;
    public string? LastProgressHash { get; set; }
    public int RepeatedHashCount { get; set; }
}

public sealed record LoopDecision(LoopVerdict Verdict, string Message, string? Injection = null);

/// <summary>
/// Loop-State-Machine Richtung Goal. Terminiert deterministisch: alle Checks grün ∨
/// max Iterationen ∨ No-Progress (Fehlerbild-Hash 2× identisch) ∨ Budget erschöpft.
/// Der Head führt pro Iteration Checkpoint + Injektion aus und ruft DecideAsync.
/// </summary>
public sealed class LoopRunner(StateStore store)
{
    private const string FileName = "loop.json";

    public LoopState Load() => store.ReadJson<LoopState>(FileName) ?? new LoopState();
    public void Save(LoopState state) => store.WriteJson(FileName, state);

    public LoopState Start(int maxIterations)
    {
        var state = new LoopState { Active = true, Iteration = 0, MaxIterations = maxIterations };
        Save(state);
        return state;
    }

    public void Stop()
    {
        var s = Load();
        s.Active = false;
        Save(s);
    }

    /// <summary>
    /// Entscheidet, ob eine weitere Iteration läuft. progressHash aus ProgressHash.Compute,
    /// budgetExhausted vom Sentinel-Budget, allGreen vom GoalTracker.
    /// </summary>
    public LoopDecision Decide(bool allGreen, string progressHash, bool budgetExhausted)
    {
        var state = Load();
        if (!state.Active) return new LoopDecision(LoopVerdict.Inactive, "Kein aktiver Loop.");

        if (allGreen) { state.Active = false; Save(state); return new LoopDecision(LoopVerdict.StopGoalReached, $"Ziel erreicht nach {state.Iteration} Iteration(en)."); }
        if (budgetExhausted) { state.Active = false; Save(state); return new LoopDecision(LoopVerdict.StopBudget, "Budget erschöpft — Loop gestoppt."); }

        if (progressHash == state.LastProgressHash)
        {
            state.RepeatedHashCount++;
            if (state.RepeatedHashCount >= 1)
            {
                state.Active = false; Save(state);
                return new LoopDecision(LoopVerdict.StopNoProgress,
                    $"Kein Fortschritt (identisches Fehlerbild) — Loop nach {state.Iteration} Iteration(en) gestoppt.");
            }
        }
        else
        {
            state.RepeatedHashCount = 0;
            state.LastProgressHash = progressHash;
        }

        state.Iteration++;
        if (state.Iteration > state.MaxIterations)
        {
            state.Active = false; Save(state);
            return new LoopDecision(LoopVerdict.StopMaxIterations, $"Maximale Iterationen ({state.MaxIterations}) erreicht.");
        }

        Save(state);
        return new LoopDecision(LoopVerdict.Continue, $"Iteration {state.Iteration}/{state.MaxIterations}.",
            $"Loop-Iteration {state.Iteration}: Ziel noch nicht erreicht. Arbeite gezielt am offenen Punkt weiter, dann werden die Checks erneut geprüft.");
    }
}
