using System.Text.Json;
using System.Text.Json.Serialization;

namespace Mkc.Copilot.Extensions.Core.Companions;

public enum CompanionKind { Skill, Proxy }

/// <summary>
/// Ein optionaler „Begleiter" (fremdes Skill oder Proxy), den wir NICHT nachbauen oder
/// vendoren, sondern nur erkennen, als Option schaltbar machen und dokumentieren.
/// </summary>
public sealed record Companion(
    string Id,
    string Name,
    CompanionKind Kind,
    string TokenEffect,     // was es spart (Input/Output/IO)
    string Homepage,
    string[] DetectPaths,   // Skill: Kandidaten-Verzeichnisse (relativ zu HOME oder cwd)
    string? ProbeEnv,       // Proxy: ENV-Variable, deren Existenz Aktivität signalisiert
    string SetupHint);

public sealed record CompanionStatus(string Id, bool Enabled, bool Detected, CompanionKind Kind, string TokenEffect);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Dictionary<string, bool>))]
public partial class CompanionJsonContext : JsonSerializerContext;

/// <summary>
/// Registry der bekannten Companions + An/Aus-Präferenz (companions.json, user-scope).
/// „Enabled" ist eine Präferenz/Markierung — das tatsächliche Laden eines Skills bleibt
/// Sache der CLI; für den Proxy (headroom) ist Erkennung real (ENV/Reachability).
/// </summary>
public sealed class CompanionRegistry
{
    public static readonly IReadOnlyList<Companion> Known =
    [
        new("caveman", "Caveman", CompanionKind.Skill,
            "Output-Tokens −~75 % (Füllwörter weg, Code/Technik erhalten)",
            "https://github.com/JuliusBrussee/caveman",
            [".copilot/skills/caveman", ".claude/skills/caveman"],
            null,
            "Skill nach ~/.copilot/skills/caveman/ (oder Projekt .claude/skills/) legen; aktiviert sich per Trigger-Phrasen."),
        new("graphify", "Graphify", CompanionKind.Skill,
            "Input-Tokens ↓ bei großen Repos (Knowledge-Graph statt Datei-Springen)",
            "https://github.com/safishamsi/graphify",
            [".copilot/skills/graphify", ".claude/skills/graphify"],
            null,
            "Skill installieren; danach den Graph einmal bauen lassen. Artefakte: HTML/Markdown/JSON."),
        new("headroom", "Headroom", CompanionKind.Proxy,
            "IO-Tokens −50…95 % (Proxy komprimiert Tool-Outputs/Logs reversibel)",
            "https://github.com/headroomlabs-ai/headroom",
            [],
            "HEADROOM_PROXY",
            "Headroom-Proxy lokal starten und die CLI/Umgebung darüber routen (ENV HEADROOM_PROXY setzen)."),
    ];

    private readonly string _configPath;

    public CompanionRegistry(string? configPath = null)
    {
        _configPath = configPath ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".copilot", "extensions", "mkc", "companions.json");
    }

    public static Companion? Find(string id) =>
        Known.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));

    private Dictionary<string, bool> LoadPrefs()
    {
        if (!File.Exists(_configPath)) return [];
        try
        {
            return JsonSerializer.Deserialize(File.ReadAllText(_configPath), CompanionJsonContext.Default.DictionaryStringBoolean)
                   ?? [];
        }
        catch { return []; }
    }

    private void SavePrefs(Dictionary<string, bool> prefs)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_configPath)!);
        var tmp = _configPath + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(prefs, CompanionJsonContext.Default.DictionaryStringBoolean));
        File.Move(tmp, _configPath, overwrite: true);
    }

    public bool IsEnabled(string id) => LoadPrefs().GetValueOrDefault(id.ToLowerInvariant());

    public void SetEnabled(string id, bool enabled)
    {
        var prefs = LoadPrefs();
        prefs[id.ToLowerInvariant()] = enabled;
        SavePrefs(prefs);
    }

    /// <summary>Best-effort-Erkennung: Skill über Kandidaten-Verzeichnisse, Proxy über ENV.</summary>
    public bool Detect(Companion companion, string cwd)
    {
        if (companion.Kind == CompanionKind.Proxy)
            return companion.ProbeEnv is { } env && !string.IsNullOrEmpty(Environment.GetEnvironmentVariable(env));

        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        foreach (var rel in companion.DetectPaths)
            if (Directory.Exists(Path.Combine(home, rel)) || Directory.Exists(Path.Combine(cwd, rel)))
                return true;
        return false;
    }

    public IReadOnlyList<CompanionStatus> Status(string cwd)
    {
        var prefs = LoadPrefs();
        return Known.Select(c => new CompanionStatus(
            c.Id, prefs.GetValueOrDefault(c.Id), Detect(c, cwd), c.Kind, c.TokenEffect)).ToList();
    }
}
