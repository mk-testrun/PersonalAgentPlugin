using System.Text.Json;
using System.Text.Json.Serialization;
using Mkc.Copilot.Extensions.Core.Infrastructure;

namespace Mkc.Copilot.Extensions.Core.Autopilot;

public enum SessionMode
{
    Unknown,
    Interactive,
    Suspected,
    Autonomous,
}

public sealed record ModeFile(string Mode, DateTimeOffset UpdatedAt, string? SessionId);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ModeFile))]
public partial class ModeJsonContext : JsonSerializerContext;

/// <summary>
/// Cross-Process-Vertrag über mode.json: Sentinel schreibt (Heartbeat 30 s),
/// alle anderen lesen. TTL 300 s — **stale ⇒ Autonomous** (fail-strict).
/// </summary>
public sealed class ModeContract(string stateDir, IClock clock)
{
    public static readonly TimeSpan Ttl = TimeSpan.FromSeconds(300);
    public static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(30);

    private string FilePath => Path.Combine(stateDir, "mode.json");

    public SessionMode Read()
    {
        try
        {
            if (!File.Exists(FilePath)) return SessionMode.Unknown;
            var file = JsonSerializer.Deserialize(File.ReadAllText(FilePath), ModeJsonContext.Default.ModeFile);
            if (file is null) return SessionMode.Unknown;
            if (clock.UtcNow - file.UpdatedAt > Ttl) return SessionMode.Autonomous; // stale-fails-strict
            return file.Mode switch
            {
                "interactive" => SessionMode.Interactive,
                "suspected" => SessionMode.Suspected,
                "autonomous" => SessionMode.Autonomous,
                _ => SessionMode.Unknown,
            };
        }
        catch
        {
            return SessionMode.Unknown;
        }
    }

    /// <summary>Atomar via temp + move — Leser sehen nie halbe Dateien.</summary>
    public void Write(SessionMode mode, string? sessionId)
    {
        Directory.CreateDirectory(stateDir);
        var file = new ModeFile(mode switch
        {
            SessionMode.Interactive => "interactive",
            SessionMode.Suspected => "suspected",
            SessionMode.Autonomous => "autonomous",
            _ => "unknown",
        }, clock.UtcNow, sessionId);
        var tmp = FilePath + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(file, ModeJsonContext.Default.ModeFile));
        File.Move(tmp, FilePath, overwrite: true);
    }
}
