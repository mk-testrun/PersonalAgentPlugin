using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Workflow.Meta;

public enum BatchTaskStatus { Pending, Running, Done, Failed }

public sealed record BatchTask(string Id, string Description)
{
    public string Status { get; set; } = "Pending";
    public string? Result { get; set; }
}

public sealed record BatchState(List<BatchTask> Tasks)
{
    public int Pointer { get; set; }
    public bool Active { get; set; }
}

/// <summary>
/// Persistente Task-Queue (batch.json). Sequenziell, abbrechbar, wiederaufnehmbar (Pointer
/// persistiert). Der Head arbeitet je Task: Checkpoint + Budget-Scheibe + Ergebnis.
/// </summary>
public sealed class BatchRunner(StateStore store)
{
    private const string FileName = "batch.json";

    public BatchState Load() => store.ReadJson<BatchState>(FileName) ?? new BatchState([]);
    private void Save(BatchState state) => store.WriteJson(FileName, state);

    public void Add(string description)
    {
        var state = Load();
        state.Tasks.Add(new BatchTask("t" + (state.Tasks.Count + 1), description));
        Save(state);
    }

    public BatchState Start()
    {
        var state = Load();
        state.Active = true;
        state.Pointer = state.Tasks.FindIndex(t => t.Status is "Pending" or "Running");
        if (state.Pointer < 0) state.Pointer = 0;
        Save(state);
        return state;
    }

    public BatchTask? Current()
    {
        var state = Load();
        return state.Active && state.Pointer < state.Tasks.Count ? state.Tasks[state.Pointer] : null;
    }

    public void Complete(string result, bool failed)
    {
        var state = Load();
        if (state.Pointer < state.Tasks.Count)
        {
            state.Tasks[state.Pointer].Status = failed ? "Failed" : "Done";
            state.Tasks[state.Pointer].Result = result;
        }
        state.Pointer++;
        if (state.Pointer >= state.Tasks.Count) state.Active = false;
        Save(state);
    }

    public string Status()
    {
        var state = Load();
        if (state.Tasks.Count == 0) return "Batch-Queue leer.";
        var lines = state.Tasks.Select((t, i) =>
            $"{(i == state.Pointer && state.Active ? "→" : " ")} [{t.Status}] {t.Description}");
        return $"Batch ({(state.Active ? "aktiv" : "inaktiv")}):\n" + string.Join("\n", lines);
    }
}
