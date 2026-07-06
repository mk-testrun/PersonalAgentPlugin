using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.State;

/// <summary>
/// Projektlokaler Zustand unter &lt;cwd&gt;/.copilot/state/extensions/mkc/ (ENV MKC_STATE_DIR).
/// JSON-Writes sind atomar (temp + move); JSONL ist append-only.
/// </summary>
public sealed class StateStore(string rootDir)
{
    public string RootDir { get; } = rootDir;

    public static StateStore FromEnvironment()
    {
        var dir = Environment.GetEnvironmentVariable("MKC_STATE_DIR")
                  ?? Path.Combine(Environment.CurrentDirectory, ".copilot", "state", "extensions", "mkc");
        return new StateStore(dir);
    }

    public string PathFor(string relative)
    {
        var full = Path.Combine(RootDir, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        return full;
    }

    public T? ReadJson<T>(string relative, JsonSerializerOptions? options = null) where T : class
    {
        var path = Path.Combine(RootDir, relative);
        if (!File.Exists(path)) return null;
        try { return JsonSerializer.Deserialize<T>(File.ReadAllText(path), options ?? Default); }
        catch { return null; }
    }

    public void WriteJson<T>(string relative, T value, JsonSerializerOptions? options = null)
    {
        var path = PathFor(relative);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(value, options ?? Default));
        File.Move(tmp, path, overwrite: true);
    }

    public void AppendLine(string relative, string line)
    {
        var path = PathFor(relative);
        File.AppendAllText(path, line + Environment.NewLine);
    }

    public IEnumerable<string> ReadLines(string relative)
    {
        var path = Path.Combine(RootDir, relative);
        return File.Exists(path) ? File.ReadLines(path) : [];
    }

    /// <summary>
    /// Serialisiert Read-Modify-Write über parallele CLI-Sessions im selben Repo per
    /// prozessübergreifendem Advisory-Lock (&lt;relative&gt;.lock). Verhindert verlorene Updates
    /// z. B. auf budgets.json/workflows/*.json. Bei Lock-Kollision: kurzer Retry-Backoff.
    /// </summary>
    public void Mutate<T>(string relative, Func<T?, T> update, JsonSerializerOptions? options = null) where T : class
    {
        var path = PathFor(relative);
        using var _ = AcquireLock(relative);
        var current = File.Exists(path)
            ? TryDeserialize<T>(File.ReadAllText(path), options)
            : null;
        var next = update(current);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(next, options ?? Default));
        File.Move(tmp, path, overwrite: true);
    }

    private IDisposable AcquireLock(string relative)
    {
        var lockPath = PathFor(relative) + ".lock";
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                return new FileStream(lockPath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None,
                    bufferSize: 1, FileOptions.DeleteOnClose);
            }
            catch (IOException) when (attempt < 50)
            {
                Thread.Sleep(20); // bis ~1 s warten, dann aufgeben (Deadlock-Schutz)
            }
            catch (IOException)
            {
                return new NoOpLock(); // Lock nicht erreichbar ⇒ ohne Lock fortfahren (fail-open)
            }
        }
    }

    private static T? TryDeserialize<T>(string json, JsonSerializerOptions? options) where T : class
    {
        try { return JsonSerializer.Deserialize<T>(json, options ?? Default); }
        catch { return null; }
    }

    private sealed class NoOpLock : IDisposable { public void Dispose() { } }

    private static readonly JsonSerializerOptions Default = new(JsonSerializerDefaults.Web);
}
