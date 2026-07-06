using System.Text.Json;
using System.Text.RegularExpressions;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Pii;

public sealed record ScrubResult(string Text, bool ContainsHardRedaction);

/// <summary>
/// Reversible PII-Pseudonymisierung (Email/ADO-UPN/Name/Telefon → stabile Platzhalter pro Session)
/// plus harte Redaktion (IBAN/SteuerID). Ersetzt den anonymizer-proxy im REST-Pfad.
/// Map liegt lokal in pii-map.json (Datei-Rechte 0600 unter Unix).
/// </summary>
public sealed partial class PiiScrubber
{
    private const string MapFile = "pii-map.json";
    private readonly StateStore _store;
    private readonly string[] _names;
    private Dictionary<string, string> _map;

    public PiiScrubber(StateStore store, string[]? names = null)
    {
        _store = store;
        _names = names ?? LoadNames();
        _map = store.ReadJson<Dictionary<string, string>>(MapFile) ?? new();
    }

    [GeneratedRegex(@"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")]
    private static partial Regex Email();

    [GeneratedRegex(@"\b[A-Z]{2}\d{2}[ ]?(?:\d{4}[ ]?){4}\d{2}\b")]
    private static partial Regex Iban();

    [GeneratedRegex(@"\b\d{2}[ /]?\d{3}[ /]?\d{5}\b")]  // DE-SteuerID (grob)
    private static partial Regex TaxId();

    [GeneratedRegex(@"(?<!\d)(?:\+49|0)[ ]?\d{2,4}[ /-]?\d{3,8}(?!\d)")]
    private static partial Regex PhoneDe();

    public ScrubResult Scrub(string text)
    {
        if (string.IsNullOrEmpty(text)) return new ScrubResult(text, false);
        var hard = false;

        text = Iban().Replace(text, _ => { hard = true; return "[IBAN-REDIGIERT]"; });
        text = TaxId().Replace(text, _ => { hard = true; return "[STEUERID-REDIGIERT]"; });
        text = Email().Replace(text, m => Pseudonym("EMAIL", m.Value));
        text = PhoneDe().Replace(text, m => Pseudonym("PHONE", m.Value));
        foreach (var name in _names.Where(n => n.Length > 1))
            text = Regex.Replace(text, $@"\b{Regex.Escape(name)}\b", _ => Pseudonym("NAME", name), RegexOptions.IgnoreCase);

        Persist();
        return new ScrubResult(text, hard);
    }

    /// <summary>Kehrt Pseudonyme lokal wieder um (Tool deanonymize_text).</summary>
    public string Deanonymize(string text)
    {
        foreach (var (original, placeholder) in _map)
            text = text.Replace(placeholder, original);
        return text;
    }

    private string Pseudonym(string kind, string original)
    {
        if (_map.TryGetValue(original, out var existing)) return existing;
        var placeholder = $"[{kind}_{_map.Count(kv => kv.Value.StartsWith($"[{kind}", StringComparison.Ordinal)) + 1}]";
        _map[original] = placeholder;
        return placeholder;
    }

    private void Persist() => _store.WriteJson(MapFile, _map);

    private static string[] LoadNames()
    {
        var path = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".copilot", "extensions", "mkc", "pii-names.json");
        if (!File.Exists(path)) return ["Michel", "Krueer"];
        try { return JsonSerializer.Deserialize<string[]>(File.ReadAllText(path)) ?? ["Michel", "Krueer"]; }
        catch { return ["Michel", "Krueer"]; }
    }
}
