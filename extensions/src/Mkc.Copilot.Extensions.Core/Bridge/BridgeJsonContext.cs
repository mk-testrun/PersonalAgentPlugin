using System.Text.Json;
using System.Text.Json.Serialization;

namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>System.Text.Json Source-Gen — hält Startup- und Hook-Latenz klein (kein Reflection-Warmup).</summary>
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(BridgeMessage))]
[JsonSerializable(typeof(BridgeError))]
[JsonSerializable(typeof(RegistrationManifest))]
[JsonSerializable(typeof(ReadyEvent))]
[JsonSerializable(typeof(InitPayload))]
[JsonSerializable(typeof(PreToolUsePayload))]
[JsonSerializable(typeof(PreToolUseResult))]
[JsonSerializable(typeof(PostToolUsePayload))]
[JsonSerializable(typeof(PostToolUseResult))]
[JsonSerializable(typeof(UserPromptSubmittedPayload))]
[JsonSerializable(typeof(UserPromptSubmittedResult))]
[JsonSerializable(typeof(SessionStartPayload))]
[JsonSerializable(typeof(SessionStartResult))]
[JsonSerializable(typeof(SessionEndPayload))]
[JsonSerializable(typeof(ErrorOccurredPayload))]
[JsonSerializable(typeof(ErrorOccurredResult))]
[JsonSerializable(typeof(PermissionRequestPayload))]
[JsonSerializable(typeof(PermissionRequestResult))]
[JsonSerializable(typeof(ToolInvokePayload))]
[JsonSerializable(typeof(ToolInvokeResult))]
[JsonSerializable(typeof(CommandInvokePayload))]
[JsonSerializable(typeof(CommandInvokeResult))]
[JsonSerializable(typeof(SessionEventPayload))]
[JsonSerializable(typeof(UiConfirmRequest))]
[JsonSerializable(typeof(UiConfirmResult))]
[JsonSerializable(typeof(UiSelectRequest))]
[JsonSerializable(typeof(UiSelectResult))]
[JsonSerializable(typeof(UiInputRequest))]
[JsonSerializable(typeof(UiInputResult))]
[JsonSerializable(typeof(JsonElement))]
public partial class BridgeJsonContext : JsonSerializerContext;

public static class BridgeJson
{
    public static string Serialize<T>(T value) =>
        JsonSerializer.Serialize(value, typeof(T), BridgeJsonContext.Default);

    public static T Deserialize<T>(JsonElement element) =>
        (T)element.Deserialize(typeof(T), BridgeJsonContext.Default)!;

    public static JsonElement ToElement<T>(T value) =>
        JsonSerializer.SerializeToElement(value, typeof(T), BridgeJsonContext.Default);
}
