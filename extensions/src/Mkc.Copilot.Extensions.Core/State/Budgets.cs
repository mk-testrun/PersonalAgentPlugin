namespace Mkc.Copilot.Extensions.Core.State;

public sealed record BudgetsFile(Dictionary<string, int> Counters, Dictionary<string, int> Limits);

/// <summary>
/// Persistente Session-Budgets (Ausführungsplan T2.1):
/// toolCalls 300 · shell 120 · fileWrites 150 · denials 20.
/// Erschöpfung ⇒ der Aufrufer antwortet mit Deny + Handlungsanweisung.
/// </summary>
public sealed class Budgets(StateStore store)
{
    public const string FileName = "budgets.json";

    public static readonly IReadOnlyDictionary<string, int> DefaultLimits = new Dictionary<string, int>
    {
        ["toolCalls"] = 300,
        ["shell"] = 120,
        ["fileWrites"] = 150,
        ["denials"] = 20,
    };

    private BudgetsFile Load() =>
        store.ReadJson<BudgetsFile>(FileName)
        ?? new BudgetsFile([], new Dictionary<string, int>(DefaultLimits));

    /// <summary>Zählt hoch; true = Budget überschritten.</summary>
    public bool Increment(string key)
    {
        var file = Load();
        file.Counters[key] = file.Counters.GetValueOrDefault(key) + 1;
        store.WriteJson(FileName, file);
        return file.Counters[key] > file.Limits.GetValueOrDefault(key, int.MaxValue);
    }

    public void SetLimit(string key, int limit)
    {
        var file = Load();
        file.Limits[key] = limit;
        store.WriteJson(FileName, file);
    }

    public void Reset()
    {
        var file = Load();
        store.WriteJson(FileName, file with { Counters = [] });
    }

    public IReadOnlyDictionary<string, (int Used, int Limit)> Snapshot()
    {
        var file = Load();
        return file.Limits.ToDictionary(
            kv => kv.Key,
            kv => (file.Counters.GetValueOrDefault(kv.Key), kv.Value));
    }
}
