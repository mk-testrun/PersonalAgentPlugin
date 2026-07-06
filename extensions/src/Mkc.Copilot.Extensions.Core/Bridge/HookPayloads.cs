using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Bridge;

// DTOs aller hook.*/tool.*/command.*/ui.*-Methoden von mkc-bridge/1.
// Feldnamen folgen der camelCase-Policy des BridgeJsonContext.

public sealed record PreToolUsePayload(string ToolName, JsonElement ToolArgs, int Turn);

public sealed record PreToolUseResult
{
    public string? PermissionDecision { get; init; }        // "allow" | "deny" | null (= kein Votum)
    public string? PermissionDecisionReason { get; init; }
    public JsonElement? ModifiedArgs { get; init; }
    public string? AdditionalContext { get; init; }
}

public sealed record PostToolUsePayload(string ToolName, JsonElement ToolArgs, JsonElement? Result, string? Error, long DurationMs);

public sealed record PostToolUseResult(string? AdditionalContext);

public sealed record UserPromptSubmittedPayload(string Prompt);

public sealed record UserPromptSubmittedResult(string? ModifiedPrompt, string? AdditionalContext);

public sealed record SessionStartPayload(bool Resumed);

public sealed record SessionStartResult(string? AdditionalContext);

public sealed record SessionEndPayload(string? Reason);

public sealed record ErrorOccurredPayload(string Error, int Attempt);

public sealed record ErrorOccurredResult(string Action); // "retry" | "skip" | "abort"

public sealed record PermissionRequestPayload(JsonElement Request);

public sealed record PermissionRequestResult(string Decision, string? Reason = null); // "allow" | "deny" | "pass"

public sealed record ToolInvokePayload(string Name, JsonElement Args, string InvocationId);

public sealed record ToolInvokeResult(JsonElement Result, bool? IsError = null);

public sealed record CommandInvokePayload(string Name, string Args);

public sealed record CommandInvokeResult(string Text);

public sealed record SessionEventPayload(string Kind, JsonElement Data);

public sealed record InitPayload(string? SessionId, string? Cwd, string? CliVersion, string[] Capabilities);

// ---- Child → Shim (ui.*) ----

public sealed record UiConfirmRequest(string Title, string Message, int? TimeoutMs);

public sealed record UiConfirmResult(bool Confirmed, bool? TimedOut = null);

public sealed record UiSelectRequest(string Message, string[] Options, int? TimeoutMs);

public sealed record UiSelectResult(string? Choice, bool? TimedOut = null);

public sealed record UiInputRequest(string Message, int? TimeoutMs);

public sealed record UiInputResult(string? Value, bool? TimedOut = null);

public sealed record ReadyEvent(string Name, string Version, int Protocol);
