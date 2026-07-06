using System.Text;
using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;
using Mkc.Copilot.Extensions.Core.Workflow;

namespace Mkc.Copilot.Extensions.Recorder;

/// <summary>
/// mkc-work-recorder: vollständige Telemetrie (fail-open, Opt-in). Zeichnet Session-Events auf,
/// verrechnet assistant.usage zu Kosten je Session/Workflow, wertet Denies aus.
/// </summary>
public sealed class RecorderExtension(UsageAggregator usage, DenyLog denyLog, WorkflowEngine engine)
    : IExtensionHead
{
    private const string ExtensionName = "mkc-work-recorder";
    private readonly Dictionary<string, long> _toolStarts = new();
    private readonly List<long> _toolLatencies = [];
    private int _compactions;
    private int _subagents;

    public ReadyEvent Identity => new(ExtensionName, "0.1.0", BridgeProtocol.Version);

    public RegistrationManifest Manifest => new()
    {
        Name = ExtensionName,
        Version = "0.1.0",
        Hooks = ["sessionEnd"],
        Commands = [new("flightlog", "Telemetrie: last | report | costs [workflow <id>] | models | denies")],
        WantsSessionEvents =
        [
            "AssistantUsage", "ToolExecutionStart", "ToolExecutionComplete",
            "Compaction", "SubagentStarted", "SubagentCompleted", "SubagentFailed",
        ],
    };

    public void Register(BridgeHost host)
    {
        host.On<SessionEventPayload, object>("event.session", OnEventAsync);
        host.On<SessionEndPayload, object>("hook.sessionEnd", OnSessionEndAsync);
        host.On<CommandInvokePayload, CommandInvokeResult>("command.invoke", OnCommandAsync);
    }

    private Task<object?> OnEventAsync(SessionEventPayload evt, CancellationToken ct)
    {
        switch (evt.Kind)
        {
            case "AssistantUsage": RecordUsage(evt.Data); break;
            case "ToolExecutionStart": TrackStart(evt.Data); break;
            case "ToolExecutionComplete": TrackComplete(evt.Data); break;
            case "Compaction": _compactions++; break;
            case "SubagentStarted": _subagents++; break;
        }
        return Task.FromResult<object?>(null);
    }

    private void RecordUsage(JsonElement data)
    {
        var model = Str(data, "model") ?? "unknown";
        var input = Num(data, "inputTokens");
        var output = Num(data, "outputTokens");
        var cached = Num(data, "cachedTokens");
        var estimated = model == "unknown";
        usage.Record(model, input, output, cached, engine.ActiveId(), estimated);
    }

    private void TrackStart(JsonElement data)
    {
        var id = Str(data, "invocationId") ?? Str(data, "id") ?? Guid.NewGuid().ToString("n");
        _toolStarts[id] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    private void TrackComplete(JsonElement data)
    {
        var id = Str(data, "invocationId") ?? Str(data, "id") ?? "";
        if (_toolStarts.TryGetValue(id, out var start))
        {
            _toolLatencies.Add(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - start);
            _toolStarts.Remove(id);
        }
    }

    private async Task<object?> OnSessionEndAsync(SessionEndPayload payload, CancellationToken ct)
    {
        await WriteReportArtifactAsync(ct);
        return null;
    }

    private async Task<CommandInvokeResult?> OnCommandAsync(CommandInvokePayload payload, CancellationToken ct)
    {
        var parts = payload.Args.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "last";
        var text = sub switch
        {
            "costs" => CostsText(parts.Length >= 3 && parts[1] == "workflow" ? parts[2] : null),
            "models" => ModelsText(),
            "denies" => DeniesText(),
            "report" => await WriteReportArtifactAsync(ct),
            _ => LastText(),
        };
        return new CommandInvokeResult(text);
    }

    private string CostsText(string? workflowId)
    {
        var report = usage.Report(workflowId);
        var scope = workflowId is null ? "Session" : $"Workflow {workflowId}";
        var flag = report.AnyEstimated ? " (teilweise geschätzt)" : "";
        var lines = report.ByModel.Select(m =>
            $"  {m.Model}: {m.Cost:0.000} € · {m.Input}+{m.Output} Tokens · {m.Calls} Calls{(m.Estimated ? " [geschätzt]" : "")}");
        return $"Kosten {scope}: {report.TotalCost:0.000} €{flag}\n{string.Join("\n", lines)}";
    }

    private string ModelsText()
    {
        var report = usage.Report();
        if (report.ByModel.Count == 0) return "Noch keine Modell-Nutzung erfasst.";
        var total = report.ByModel.Sum(m => m.Input + m.Output + m.Cached);
        var lines = report.ByModel.Select(m =>
        {
            var share = total > 0 ? (m.Input + m.Output + m.Cached) * 100.0 / total : 0;
            return $"  {m.Model}: {m.Calls} Calls · {share:0}% der Tokens";
        });
        return "Modell-Nutzung:\n" + string.Join("\n", lines);
    }

    private string DeniesText()
    {
        var denies = denyLog.ReadAll().ToList();
        if (denies.Count == 0) return "Keine Denies erfasst.";
        var auto = denies.Count(d => d.Auto);
        var byRule = denies.GroupBy(d => d.Rule).OrderByDescending(g => g.Count())
            .Select(g => $"  {g.Key}: {g.Count()}×");
        return $"Denies gesamt: {denies.Count} (automatisch: {auto}, nach Dialog: {denies.Count - auto})\n" +
               string.Join("\n", byRule);
    }

    private string LastText()
    {
        var report = usage.Report();
        return $"Flightlog: {report.ByModel.Sum(m => m.Calls)} Modell-Calls · {report.TotalCost:0.000} € · " +
               $"{_toolLatencies.Count} Tool-Calls · {_compactions} Compactions · {denyLog.ReadAll().Count()} Denies.";
    }

    private async Task<string> WriteReportArtifactAsync(CancellationToken ct)
    {
        var cwd = Environment.GetEnvironmentVariable("MKC_CWD") ?? Environment.CurrentDirectory;
        var dir = Path.Combine(cwd, ".copilot", "state", "artifacts");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"flight-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}.md");

        var report = usage.Report();
        var sb = new StringBuilder();
        sb.AppendLine("# Flight-Report").AppendLine();
        sb.AppendLine($"- Erzeugt: {DateTimeOffset.UtcNow:u}");
        sb.AppendLine($"- Gesamtkosten: {report.TotalCost:0.000} €{(report.AnyEstimated ? " (teilweise geschätzt)" : "")}");
        sb.AppendLine($"- Tokens: {report.TotalInput} in / {report.TotalOutput} out / {report.TotalCached} cached");
        sb.AppendLine($"- Tool-Calls: {_toolLatencies.Count} · Compactions: {_compactions} · Subagents: {_subagents}");
        sb.AppendLine().AppendLine("## Kosten je Modell").AppendLine();
        sb.AppendLine("| Modell | Calls | Kosten € | Tokens (in/out/cached) |");
        sb.AppendLine("|---|---|---|---|");
        foreach (var m in report.ByModel)
            sb.AppendLine($"| {m.Model} | {m.Calls} | {m.Cost:0.000} | {m.Input}/{m.Output}/{m.Cached} |");
        if (_toolLatencies.Count > 0)
        {
            var sorted = _toolLatencies.OrderBy(x => x).ToList();
            sb.AppendLine().AppendLine("## Tool-Latenz").AppendLine();
            sb.AppendLine($"- Median: {sorted[sorted.Count / 2]} ms · Max: {sorted[^1]} ms");
        }
        sb.AppendLine().AppendLine("## Denies").AppendLine().AppendLine(DeniesText());

        await File.WriteAllTextAsync(path, sb.ToString(), ct);
        return $"Flight-Report geschrieben: {path}\n\n{LastText()}";
    }

    private static string? Str(JsonElement el, string prop) =>
        TryProp(el, prop) is { ValueKind: JsonValueKind.String } v ? v.GetString() : null;

    private static long Num(JsonElement el, string prop) =>
        TryProp(el, prop) is { ValueKind: JsonValueKind.Number } v ? v.GetInt64() : 0;

    private static JsonElement? TryProp(JsonElement el, string prop)
    {
        if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v)) return v;
        // Auch verschachtelt unter data.* suchen
        if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("data", out var d)
            && d.ValueKind == JsonValueKind.Object && d.TryGetProperty(prop, out var nv)) return nv;
        return null;
    }
}
