using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>
/// Envelope des mkc-bridge/1-Protokolls (Ebene Stecker ↔ .NET, NDJSON — bewusst kein JSON-RPC 2.0).
/// Kanonische Spec: docs/extensions-bridge-protocol.md.
/// </summary>
public sealed record BridgeMessage
{
    public int V { get; init; } = BridgeProtocol.Version;
    public string? Id { get; init; }
    public required string Type { get; init; } // "req" | "res" | "event"
    public string? Method { get; init; }
    public JsonElement? Payload { get; init; }
    public bool? Ok { get; init; }
    public BridgeError? Error { get; init; }
}

public sealed record BridgeError(string Code, string Message);

public static class BridgeProtocol
{
    public const int Version = 1;
}
