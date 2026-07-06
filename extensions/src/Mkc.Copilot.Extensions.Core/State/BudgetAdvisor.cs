using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.State;

public sealed record BudgetSuggestion(string Key, int CurrentLimit, int Suggested, string Basis);

/// <summary>
/// Statistik-gestützte Budget-Vorschläge: liest die Recorder-Historie (recorder/usage.jsonl,
/// vom mkc-work-recorder geschrieben — Kopplung nur über die Datei) und schlägt Limits aus
/// dem beobachteten Verbrauch vor (Perzentil-nah: Median × Faktor, gedeckelt).
/// </summary>
public sealed class BudgetAdvisor(StateStore store)
{
    public IReadOnlyList<BudgetSuggestion> Suggest(IReadOnlyDictionary<string, (int Used, int Limit)> current)
    {
        // Anzahl der usage-Events ≈ Modell-Calls pro Session; als grober Proxy für toolCalls-Bedarf.
        var callsPerSession = CallCountsPerSession();
        if (callsPerSession.Count == 0) return [];

        var median = Median(callsPerSession);
        var p90 = Percentile(callsPerSession, 0.9);
        var suggestions = new List<BudgetSuggestion>();

        // toolCalls an p90 der beobachteten Calls ausrichten (mit 20 % Puffer), min. aktueller Wert/2.
        if (current.TryGetValue("toolCalls", out var tc))
        {
            var suggested = Math.Clamp((int)Math.Ceiling(p90 * 1.2), 50, 2000);
            suggestions.Add(new BudgetSuggestion("toolCalls", tc.Limit, suggested,
                $"p90 der Calls/Session = {p90:0}, Median {median:0} über {callsPerSession.Count} Session(s)"));
        }
        return suggestions;
    }

    private List<int> CallCountsPerSession()
    {
        // usage.jsonl hat keine Session-Grenzen; wir approximieren pro Tag als „Session".
        var perDay = new Dictionary<string, int>();
        foreach (var line in store.ReadLines("recorder/usage.jsonl"))
        {
            try
            {
                using var doc = JsonDocument.Parse(line);
                var ts = doc.RootElement.TryGetProperty("ts", out var t) ? t.GetDateTimeOffset() : DateTimeOffset.UtcNow;
                var day = ts.ToString("yyyy-MM-dd");
                perDay[day] = perDay.GetValueOrDefault(day) + 1;
            }
            catch { /* halbe Zeile */ }
        }
        return perDay.Values.OrderBy(x => x).ToList();
    }

    private static double Median(List<int> sorted) =>
        sorted.Count == 0 ? 0 : sorted[sorted.Count / 2];

    private static double Percentile(List<int> sorted, double p)
    {
        if (sorted.Count == 0) return 0;
        var idx = (int)Math.Ceiling(p * sorted.Count) - 1;
        return sorted[Math.Clamp(idx, 0, sorted.Count - 1)];
    }
}
