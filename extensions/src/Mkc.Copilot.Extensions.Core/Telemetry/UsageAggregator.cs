using System.Text.Json;
using System.Text.Json.Serialization;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Telemetry;

public sealed record UsageEntry(
    DateTimeOffset Ts, string Model, long InputTokens, long OutputTokens, long CachedTokens,
    string? WorkflowId, bool Estimated, double? RealCost = null, string? Initiator = null);

public sealed record FleetLine(string Initiator, long Input, long Output, int Calls, double Cost, bool Estimated);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(UsageEntry))]
public partial class UsageJsonContext : JsonSerializerContext;

public sealed record ModelBreakdown(string Model, long Input, long Output, long Cached, int Calls, double Cost, bool Estimated);
public sealed record CostReport(long TotalInput, long TotalOutput, long TotalCached, double TotalCost, bool AnyEstimated, List<ModelBreakdown> ByModel);

/// <summary>
/// Schreibt usage.jsonl aus assistant.usage-Events und aggregiert Kosten je Session/Workflow
/// über die PriceTable (Ausführungsplan §4.4). Fehlt ein Preis, wird „geschätzt" markiert.
/// </summary>
public sealed class UsageAggregator(StateStore store, PriceTable prices)
{
    public const string FileName = "recorder/usage.jsonl";

    public void Record(string model, long input, long output, long cached, string? workflowId, bool estimated,
        double? realCost = null, string? initiator = null)
    {
        var entry = new UsageEntry(DateTimeOffset.UtcNow, model, input, output, cached, workflowId, estimated, realCost, initiator);
        store.AppendLine(FileName, JsonSerializer.Serialize(entry, UsageJsonContext.Default.UsageEntry));
    }

    /// <summary>Kostenaufschlüsselung je (Sub-)Agent — für Fleet-Läufe (initiator-Feld der usage-Events).</summary>
    public IReadOnlyList<FleetLine> FleetBreakdown()
    {
        return ReadAll()
            .Where(e => e.Initiator is { Length: > 0 })
            .GroupBy(e => e.Initiator!)
            .Select(g =>
            {
                var input = g.Sum(e => e.InputTokens);
                var output = g.Sum(e => e.OutputTokens);
                var cost = g.All(e => e.RealCost is not null)
                    ? g.Sum(e => e.RealCost!.Value)
                    : prices.Cost(g.First().Model, input, output, g.Sum(e => e.CachedTokens)).Cost;
                var estimated = g.Any(e => e.Estimated) || g.Any(e => e.RealCost is null);
                return new FleetLine(g.Key, input, output, g.Count(), cost, estimated);
            })
            .OrderByDescending(f => f.Cost)
            .ToList();
    }

    public IEnumerable<UsageEntry> ReadAll()
    {
        foreach (var line in store.ReadLines(FileName))
        {
            UsageEntry? e = null;
            try { e = JsonSerializer.Deserialize(line, UsageJsonContext.Default.UsageEntry); }
            catch { /* halbe Zeile */ }
            if (e is not null) yield return e;
        }
    }

    public CostReport Report(string? workflowId = null)
    {
        var entries = ReadAll().Where(e => workflowId is null || e.WorkflowId == workflowId).ToList();
        var byModel = entries
            .GroupBy(e => e.Model)
            .Select(g =>
            {
                var input = g.Sum(e => e.InputTokens);
                var output = g.Sum(e => e.OutputTokens);
                var cached = g.Sum(e => e.CachedTokens);
                // Reale CLI-Kosten bevorzugen, wenn jeder Eintrag der Gruppe sie mitliefert;
                // sonst über die PriceTable schätzen.
                if (g.All(e => e.RealCost is not null))
                    return new ModelBreakdown(g.Key, input, output, cached, g.Count(), g.Sum(e => e.RealCost!.Value), false);
                var (cost, estimated) = prices.Cost(g.Key, input, output, cached);
                return new ModelBreakdown(g.Key, input, output, cached, g.Count(), cost, estimated || g.Any(e => e.Estimated));
            })
            .OrderByDescending(m => m.Cost)
            .ToList();

        return new CostReport(
            byModel.Sum(m => m.Input), byModel.Sum(m => m.Output), byModel.Sum(m => m.Cached),
            byModel.Sum(m => m.Cost), byModel.Any(m => m.Estimated), byModel);
    }
}
