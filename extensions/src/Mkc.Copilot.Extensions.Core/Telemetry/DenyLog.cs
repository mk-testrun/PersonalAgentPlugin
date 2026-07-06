using System.Text.Json;
using System.Text.Json.Serialization;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Telemetry;

public sealed record DenyEntry(
    DateTimeOffset Ts,
    string Extension,
    string Rule,
    string Tool,
    string ArgsDigest,
    string Mode,
    bool Auto); // true = automatisch verweigert (Autopilot/Deadline), false = nach Dialog

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(DenyEntry))]
public partial class DenyJsonContext : JsonSerializerContext;

/// <summary>
/// denials.jsonl: Guardian/Sentinel schreiben append-only, der Recorder liest —
/// die einzige Kopplung ist die Datei (Architektur-Prinzip „State statt IPC").
/// </summary>
public sealed class DenyLog(StateStore store)
{
    public const string FileName = "denials.jsonl";

    public void Append(DenyEntry entry) =>
        store.AppendLine(FileName, JsonSerializer.Serialize(entry, DenyJsonContext.Default.DenyEntry));

    public IEnumerable<DenyEntry> ReadAll()
    {
        foreach (var line in store.ReadLines(FileName))
        {
            DenyEntry? entry = null;
            try { entry = JsonSerializer.Deserialize(line, DenyJsonContext.Default.DenyEntry); }
            catch { /* halbe Zeile beim parallelen Schreiben — überspringen */ }
            if (entry is not null) yield return entry;
        }
    }

    public DenyEntry? Last() => ReadAll().LastOrDefault();

    /// <summary>Digest statt Klartext — Args können Secrets/PII enthalten.</summary>
    public static string Digest(string args)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(args));
        return Convert.ToHexStringLower(bytes)[..16];
    }
}
