using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Policy;

namespace Mkc.Copilot.Extensions.Guardian;

/// <summary>
/// Code = Wahrheit: eingebettete Work-Policy (ADR-0004). Optionaler Override:
/// ~/.copilot/extensions/mkc-work-guardian/policy.json ⇒ {"protectedBranches":[…],"protectedBranchPrefixes":[…]}.
/// </summary>
public static class DefaultPolicy
{
    public static GitPolicy Load()
    {
        var overridePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".copilot", "extensions", "mkc-work-guardian", "policy.json");
        if (!File.Exists(overridePath)) return new GitPolicy();
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(overridePath));
            var root = doc.RootElement;
            return new GitPolicy
            {
                ProtectedBranches = ReadArray(root, "protectedBranches") ?? new GitPolicy().ProtectedBranches,
                ProtectedBranchPrefixes = ReadArray(root, "protectedBranchPrefixes") ?? new GitPolicy().ProtectedBranchPrefixes,
            };
        }
        catch
        {
            return new GitPolicy(); // kaputter Override ⇒ eingebettete Policy (fail-safe)
        }
    }

    private static string[]? ReadArray(JsonElement root, string name) =>
        root.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.Array
            ? [.. el.EnumerateArray().Select(e => e.GetString() ?? "")]
            : null;

    /// <summary>Tool-Namen, deren Args als Shell-Kommando zu prüfen sind.</summary>
    public static readonly HashSet<string> ShellTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "shell", "bash", "sh", "terminal", "run_in_terminal", "execute_command", "run_command", "powershell",
    };

    /// <summary>Tool-Namen, die als Datei-Schreiboperation zählen (Budget fileWrites).</summary>
    public static readonly HashSet<string> WriteTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "write", "write_file", "edit", "edit_file", "str_replace", "create_file", "apply_patch",
    };
}
