using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Telemetry;

public sealed record ModelPrice(double InputPer1k, double OutputPer1k, double CachedPer1k);

/// <summary>
/// Preistabelle (Ausführungsplan §T2.1, Stand 2026-07-01, €/1k Tokens). Editierbar über
/// ~/.copilot/extensions/mkc/prices.json. Unbekanntes Modell ⇒ null ⇒ „geschätzt (kein Preis)".
/// </summary>
public sealed class PriceTable
{
    public string Updated { get; init; } = "2026-07-01";
    public Dictionary<string, ModelPrice> Prices { get; init; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["gpt-5"] = new(0.010, 0.030, 0.001),
        ["claude-sonnet-4.5"] = new(0.009, 0.027, 0.001),
        ["gpt-5-mini"] = new(0.002, 0.006, 0.0002),
    };

    public ModelPrice? For(string model) => Prices.GetValueOrDefault(model);

    public static PriceTable Load()
    {
        var path = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".copilot", "extensions", "mkc", "prices.json");
        if (!File.Exists(path)) return new PriceTable();
        try { return JsonSerializer.Deserialize<PriceTable>(File.ReadAllText(path)) ?? new PriceTable(); }
        catch { return new PriceTable(); }
    }

    /// <summary>Kosten in € (0 wenn Modell unbekannt).</summary>
    public (double Cost, bool Estimated) Cost(string model, long input, long output, long cached)
    {
        var price = For(model);
        if (price is null) return (0, true);
        var cost = input / 1000.0 * price.InputPer1k
                   + output / 1000.0 * price.OutputPer1k
                   + cached / 1000.0 * price.CachedPer1k;
        return (cost, false);
    }
}
