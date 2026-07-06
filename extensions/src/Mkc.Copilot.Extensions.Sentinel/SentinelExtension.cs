using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;

namespace Mkc.Copilot.Extensions.Sentinel;

/// <summary>
/// mkc-work-sentinel: Autopilot-Erkennung (mode.json mit Heartbeat), Budgets, Checkpoints,
/// begrenzte Retries (fail-closed).
/// </summary>
public sealed class SentinelExtension(StateStore store, ModeContract modeContract, ModeDetector detector, Checkpointer checkpointer)
    : IExtensionHead
{
    private const string ExtensionName = "mkc-work-sentinel";
    private readonly Budgets _budgets = new(store);
    private readonly DenyLog _denyLog = new(store);
    private int _lastCheckpointTurn = -1;

    private static readonly HashSet<string> ShellTools = new(StringComparer.OrdinalIgnoreCase)
        { "shell", "bash", "sh", "terminal", "run_in_terminal", "execute_command", "run_command", "powershell" };
    private static readonly HashSet<string> WriteTools = new(StringComparer.OrdinalIgnoreCase)
        { "write", "write_file", "edit", "edit_file", "str_replace", "create_file", "apply_patch" };

    public ReadyEvent Identity => new(ExtensionName, "0.1.0", BridgeProtocol.Version);

    public RegistrationManifest Manifest => new()
    {
        Name = ExtensionName,
        Version = "0.1.0",
        Hooks = ["preToolUse", "errorOccurred", "sessionStart", "sessionEnd"],
        Commands =
        [
            new("autopilot", "Autopilot-Modus: on|off|auto|status"),
            new("budget", "Session-Budgets: show | set <key> <n>"),
            new("checkpoint", "Checkpoints: list | create"),
        ],
        WantsPermissionFlow = true,
        WantsSessionEvents = ["UserMessage", "ToolExecutionStart", "ToolExecutionComplete", "SessionIdle", "AutoModeSwitch"],
    };

    public void Register(BridgeHost host)
    {
        host.On<SessionEventPayload, object>("event.session", OnSessionEventAsync);
        host.On<PermissionRequestPayload, PermissionRequestResult>("permission.request", OnPermissionRequestAsync);
        host.On<PreToolUsePayload, PreToolUseResult>("hook.preToolUse", OnPreToolUseAsync);
        host.On<ErrorOccurredPayload, ErrorOccurredResult>("hook.errorOccurred", OnErrorAsync);
        host.On<SessionStartPayload, SessionStartResult>("hook.sessionStart", OnSessionStartAsync);
        host.On<SessionEndPayload, object>("hook.sessionEnd", (_, _) => Task.FromResult<object?>(null));
        host.On<CommandInvokePayload, CommandInvokeResult>("command.invoke", OnCommandAsync);

        _ = HeartbeatAsync(host.ShutdownToken); // hält mode.json frisch (TTL-Semantik, stale ⇒ autonomous)
    }

    private async Task HeartbeatAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(ModeContract.HeartbeatInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(ct))
                PublishMode();
        }
        catch (OperationCanceledException) { /* Shutdown */ }
    }

    private void PublishMode() =>
        modeContract.Write(detector.Current, Environment.GetEnvironmentVariable("MKC_SESSION_ID"));

    private Task<object?> OnSessionEventAsync(SessionEventPayload evt, CancellationToken ct)
    {
        switch (evt.Kind)
        {
            case "ToolExecutionStart": detector.OnToolExecutionStart(); break;
            case "UserMessage": detector.OnUserMessage(); break;
            case "AutoModeSwitch":
                // Autoritatives Autopilot-Signal der CLI (besser als Heuristik).
                var enabled = evt.Data.ValueKind == JsonValueKind.Object
                              && evt.Data.TryGetProperty("enabled", out var e)
                              && e.ValueKind is JsonValueKind.True or JsonValueKind.False
                    ? e.GetBoolean() : (bool?)null;
                if (enabled is true) detector.SetAuthoritative(SessionMode.Autonomous);
                else if (enabled is false) detector.SetAuthoritative(SessionMode.Interactive);
                break;
        }
        PublishMode();
        return Task.FromResult<object?>(null);
    }

    private Task<PermissionRequestResult?> OnPermissionRequestAsync(PermissionRequestPayload payload, CancellationToken ct)
    {
        detector.OnPermissionRequest();
        PublishMode();
        return Task.FromResult<PermissionRequestResult?>(new PermissionRequestResult("pass"));
    }

    private async Task<PreToolUseResult?> OnPreToolUseAsync(PreToolUsePayload payload, CancellationToken ct)
    {
        var exceeded = _budgets.Increment("toolCalls");
        if (ShellTools.Contains(payload.ToolName)) exceeded |= _budgets.Increment("shell");
        var isMutating = WriteTools.Contains(payload.ToolName) || ShellTools.Contains(payload.ToolName);
        if (WriteTools.Contains(payload.ToolName)) exceeded |= _budgets.Increment("fileWrites");

        if (exceeded)
        {
            _denyLog.Append(new DenyEntry(DateTimeOffset.UtcNow, ExtensionName, "budget-exhausted",
                payload.ToolName, DenyLog.Digest(payload.ToolName), detector.Current.ToString().ToLowerInvariant(), true));
            return new PreToolUseResult
            {
                PermissionDecision = "deny",
                PermissionDecisionReason = "[budget-exhausted] Session-Budget erschöpft.",
                AdditionalContext = "mkc-work-sentinel: Budget erschöpft — fasse den Stand zusammen und stoppe. " +
                                    "Der Nutzer kann mit /budget set <key> <n> erhöhen.",
            };
        }

        // Autopilot: vor der ersten mutierenden Op eines Turns Checkpoint erzwingen
        if (isMutating && detector.Current == SessionMode.Autonomous && payload.Turn != _lastCheckpointTurn)
        {
            _lastCheckpointTurn = payload.Turn;
            try { await checkpointer.CreateAsync($"auto-turn-{payload.Turn}", ct); }
            catch (Exception ex) { await Console.Error.WriteLineAsync($"[sentinel] Checkpoint fehlgeschlagen: {ex.Message}"); }
        }
        return null;
    }

    private Task<ErrorOccurredResult?> OnErrorAsync(ErrorOccurredPayload payload, CancellationToken ct)
    {
        var action = payload.Attempt <= 2
            ? "retry"
            : detector.Current == SessionMode.Autonomous ? "abort" : "skip";
        return Task.FromResult<ErrorOccurredResult?>(new ErrorOccurredResult(action));
    }

    private Task<SessionStartResult?> OnSessionStartAsync(SessionStartPayload payload, CancellationToken ct)
    {
        if (!payload.Resumed) _budgets.Reset();
        PublishMode();
        return Task.FromResult<SessionStartResult?>(null);
    }

    private async Task<CommandInvokeResult?> OnCommandAsync(CommandInvokePayload payload, CancellationToken ct)
    {
        var parts = payload.Args.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var text = payload.Name switch
        {
            "autopilot" => HandleAutopilot(parts.FirstOrDefault() ?? "status"),
            "budget" => HandleBudget(parts),
            "checkpoint" => await HandleCheckpointAsync(parts.FirstOrDefault() ?? "list", ct),
            _ => $"Unbekanntes Kommando: {payload.Name}",
        };
        return new CommandInvokeResult(text);
    }

    private string HandleAutopilot(string sub)
    {
        switch (sub)
        {
            case "on": detector.SetAuthoritative(SessionMode.Autonomous); break;
            case "off": detector.SetAuthoritative(SessionMode.Interactive); break;
            case "auto": detector.SetAuthoritative(null); break;
        }
        PublishMode();
        var source = detector.IsAuthoritative ? "gesetzt" : "Heuristik";
        return $"Autopilot-Modus: {detector.Current} ({source})";
    }

    private string HandleBudget(string[] parts)
    {
        if (parts is ["set", var key, var value] && int.TryParse(value, out var limit))
        {
            _budgets.SetLimit(key, limit);
            return $"Budget {key} = {limit}";
        }
        var lines = _budgets.Snapshot().Select(kv => $"{kv.Key}: {kv.Value.Used}/{kv.Value.Limit}");
        return "Budgets (verbraucht/Limit):\n" + string.Join("\n", lines);
    }

    private async Task<string> HandleCheckpointAsync(string sub, CancellationToken ct)
    {
        if (sub == "create")
        {
            var cp = await checkpointer.CreateAsync("manuell", ct);
            return $"Checkpoint #{cp.Number} erstellt ({cp.Sha[..8]}).";
        }
        var list = checkpointer.List();
        return list.Count == 0
            ? "Keine Checkpoints in diesem Projekt."
            : string.Join("\n", list.Select(c => $"#{c.Number} {c.CreatedAt:u} {c.Sha[..8]} {c.Label}"));
    }
}
