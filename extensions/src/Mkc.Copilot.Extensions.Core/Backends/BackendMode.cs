using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Core.Backends;

public sealed record BackendModeFile(string Backend); // "local" | "remote"

/// <summary>Persistiert den aktiven Backend-Modus pro Projekt (backend.json).</summary>
public sealed class BackendModeStore(StateStore store)
{
    private const string FileName = "backend.json";

    public string Read() => store.ReadJson<BackendModeFile>(FileName)?.Backend ?? "local";
    public void Write(string backend) => store.WriteJson(FileName, new BackendModeFile(backend));
}
