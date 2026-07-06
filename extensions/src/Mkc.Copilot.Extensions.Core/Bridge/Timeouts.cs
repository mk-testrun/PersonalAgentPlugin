namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>Timeout-Tabelle aus dem Ausführungsplan §T2.1 — identisch im Shim (bridge.mjs).</summary>
public static class Timeouts
{
    public static readonly TimeSpan ConfirmDeadline = TimeSpan.FromMilliseconds(60_000);

    public static TimeSpan For(string method) => method switch
    {
        "hook.preToolUse" or "hook.postToolUse" or "hook.postToolUseFailure" => TimeSpan.FromMilliseconds(2_000),
        "permission.request" => TimeSpan.FromMilliseconds(2_000),
        "hook.userPromptSubmitted" or "hook.errorOccurred" => TimeSpan.FromMilliseconds(1_500),
        "hook.sessionStart" or "hook.sessionEnd" or "shutdown" => TimeSpan.FromMilliseconds(3_000),
        "tool.invoke" or "command.invoke" => TimeSpan.FromMilliseconds(60_000),
        _ => TimeSpan.FromMilliseconds(5_000),
    };
}
