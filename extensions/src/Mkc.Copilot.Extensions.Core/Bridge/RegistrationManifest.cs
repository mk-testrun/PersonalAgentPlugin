using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>
/// Antwort des Childs auf `init`: deklariert, was der Shim bei joinSession registriert.
/// </summary>
public sealed record RegistrationManifest
{
    public required string Name { get; init; }
    public required string Version { get; init; }
    public string Status { get; init; } = "experimental";
    public string[] Hooks { get; init; } = [];              // z. B. "preToolUse", "sessionStart"
    public ToolSpec[] Tools { get; init; } = [];
    public CommandSpec[] Commands { get; init; } = [];
    public SystemMessageSpec? SystemMessage { get; init; }
    public bool WantsPermissionFlow { get; init; }
    public string[] WantsSessionEvents { get; init; } = []; // z. B. "ToolExecutionStart"
}

public sealed record ToolSpec(string Name, string Description, JsonElement InputSchema, bool? SkipPermission = null, bool? Defer = null);

public sealed record CommandSpec(string Name, string Description);

public sealed record SystemMessageSpec(string Mode, SystemMessageSection[] Sections); // Mode: "append"

public sealed record SystemMessageSection(string Name, string Text);
