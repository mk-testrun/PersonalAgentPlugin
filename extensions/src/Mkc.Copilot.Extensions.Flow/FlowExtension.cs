using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Backends;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Pii;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Workflow;

namespace Mkc.Copilot.Extensions.Flow;

/// <summary>
/// mkc-work-flow: Workflows, Work-Konventionen, Local/Remote-Backend-Fassade, PII-Scrub (fail-open).
/// Phase 2: lokal (LocalBackend). Remote-Backends kommen in Phase 3 (SyncEngine).
/// </summary>
public sealed class FlowExtension(
    ModeContract modeContract, WorkflowEngine engine,
    BackendModeStore backendMode, PiiScrubber pii, string cwd) : IExtensionHead
{
    private const string ExtensionName = "mkc-work-flow";

    public ReadyEvent Identity => new(ExtensionName, "0.1.0", BridgeProtocol.Version);

    public RegistrationManifest Manifest => new()
    {
        Name = ExtensionName,
        Version = "0.1.0",
        Hooks = ["userPromptSubmitted", "sessionStart", "postToolUse"],
        SystemMessage = new SystemMessageSpec("append",
            [new SystemMessageSection("mkc-work-conventions", WorkConventions.SystemMessageSection)]),
        Commands =
        [
            new("mode", "Backend-Modus: status | local | remote"),
            new("workflow", "Workflow: list | resume [id] | next | skip [step] | add <titel> | abort"),
            new("feature", "Feature-Workflow starten: /feature start \"Titel\""),
            new("bugfix", "Bugfix-Workflow starten"),
            new("doc", "Doku-Workflow starten"),
            new("refactor", "Refactoring-Workflow starten"),
            new("review", "Review-Workflow starten"),
            new("security", "Security-Workflow starten"),
            new("release", "Release-Workflow starten"),
            new("moin", "Workday-Start: git-Status, offene Workflows, Tagesplan"),
            new("commitmsg", "Conventional-Commit-Nachricht aus staged Diff bauen"),
        ],
        Tools =
        [
            new("compose_commit_message", "Baut eine Conventional-Commit-Nachricht aus dem staged Diff.",
                JsonDocument.Parse("""{"type":"object","properties":{}}""").RootElement, Defer: true),
            new("deanonymize_text", "Macht lokale PII-Pseudonyme wieder rückgängig (rein lokal).",
                JsonDocument.Parse("""{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}""").RootElement,
                SkipPermission: true, Defer: true),
        ],
    };

    public void Register(BridgeHost host)
    {
        host.On<UserPromptSubmittedPayload, UserPromptSubmittedResult>("hook.userPromptSubmitted", OnPromptAsync);
        host.On<SessionStartPayload, SessionStartResult>("hook.sessionStart", OnSessionStartAsync);
        host.On<PostToolUsePayload, PostToolUseResult>("hook.postToolUse", OnPostToolUseAsync);
        host.On<CommandInvokePayload, CommandInvokeResult>("command.invoke", OnCommandAsync);
        host.On<ToolInvokePayload, ToolInvokeResult>("tool.invoke", OnToolAsync);
    }

    private async Task<UserPromptSubmittedResult?> OnPromptAsync(UserPromptSubmittedPayload payload, CancellationToken ct)
    {
        var result = pii.Scrub(payload.Prompt);
        if (result.Text == payload.Prompt) return null;
        var context = result.ContainsHardRedaction
            ? "mkc-work-flow: IBAN/SteuerID wurden vor dem Modell redigiert."
            : null;
        return new UserPromptSubmittedResult(result.Text, context);
    }

    private async Task<SessionStartResult?> OnSessionStartAsync(SessionStartPayload payload, CancellationToken ct)
    {
        var parts = new List<string>();
        var activeId = engine.ActiveId();
        if (activeId is not null && engine.Load(activeId) is { } state)
            parts.Add(engine.ReentryBlock(state));
        parts.Add($"Backend-Modus: {backendMode.Read()}");
        var projectCtx = await WorkConventions.ProjectContextAsync(cwd, ct);
        if (!string.IsNullOrEmpty(projectCtx)) parts.Add(projectCtx);
        return new SessionStartResult(string.Join("\n", parts));
    }

    private Task<PostToolUseResult?> OnPostToolUseAsync(PostToolUsePayload payload, CancellationToken ct)
        => Task.FromResult<PostToolUseResult?>(null); // Gate-Registrierung: Phase 4 (Test-Marker)

    private async Task<CommandInvokeResult?> OnCommandAsync(CommandInvokePayload payload, CancellationToken ct)
    {
        var mode = modeContract.Read();
        var text = payload.Name switch
        {
            "mode" => HandleMode(payload.Args.Trim()),
            "workflow" => await HandleWorkflowAsync(payload.Args.Trim(), mode, ct),
            "moin" => await HandleMoinAsync(mode, ct),
            "commitmsg" => await HandleCommitMsgAsync(ct),
            "feature" or "bugfix" or "doc" or "refactor" or "review" or "security" or "release"
                => await HandleStartAsync(payload.Name, payload.Args.Trim(), mode, ct),
            _ => $"Unbekanntes Kommando: {payload.Name}",
        };
        return new CommandInvokeResult(text);
    }

    private string HandleMode(string arg)
    {
        switch (arg)
        {
            case "local": backendMode.Write("local"); return "Backend-Modus: local (dateibasiert).";
            case "remote": return "Remote-Backend kommt in Phase 3 (SyncEngine). Aktuell: " + backendMode.Read();
            default: return $"Backend-Modus: {backendMode.Read()}";
        }
    }

    private async Task<string> HandleStartAsync(string definition, string args, SessionMode mode, CancellationToken ct)
    {
        var title = ParseQuoted(args, afterKeyword: "start");
        if (title is null) return $"Nutzung: /{definition} start \"Titel\"";

        var branch = (await GitRunner.RunAsync(cwd, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).StdOut;
        var ado = WorkConventions.ExtractAdoRef(branch);
        var id = ado?.Replace("#", "").ToLowerInvariant() ?? Slug(title);

        var state = engine.Start(definition, id, title);
        if (ado is not null) state.Ado = ado;
        engine.Save(state);

        var backend = new LocalBackend(cwd);
        await backend.CreateTicketAsync(id, title,
            $"## Ziel\n{title}\n\n## Akzeptanzkriterien\n- <vom Agenten ausfüllen>\n\n## Schritte\n- [ ] …", ct);

        var suggested = $"{definition}/{(ado is not null ? ado.Replace("#", "").ToLowerInvariant() + "-" : "")}{Slug(title)}";
        return $"Workflow '{definition}' gestartet (id {id}). Plan: .copilot/planning/{id}/plan.md\n" +
               $"Branch-Vorschlag: {suggested}\nErster Schritt: {Definitions.All[definition].Steps[0].Title}. " +
               $"Plan-Lücken (Akzeptanzkriterien) jetzt ausfüllen, dann /workflow next.";
    }

    private async Task<string> HandleWorkflowAsync(string args, SessionMode mode, CancellationToken ct)
    {
        var parts = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "list";
        var rest = parts.Length > 1 ? parts[1] : "";

        switch (sub)
        {
            case "list":
                var all = engine.List();
                return all.Count == 0 ? "Keine Workflows in diesem Projekt."
                    : string.Join("\n", all.Select(s => $"{(s.Id == engine.ActiveId() ? "→" : " ")} {s.Definition}/{s.Id} '{s.Title}' @ {s.CurrentStep}"));
            case "resume":
                var id = string.IsNullOrEmpty(rest) ? engine.ActiveId() : rest;
                if (id is null || engine.Load(id) is not { } st) return "Kein Workflow zum Wiederaufnehmen.";
                engine.SetActive(id);
                return engine.ReentryBlock(st);
            case "next":
                if (Active() is not { } state) return "Kein aktiver Workflow.";
                var r = await engine.NextAsync(state, mode, ct);
                return r.Message;
            case "skip":
                if (Active() is not { } s2) return "Kein aktiver Workflow.";
                var skip = engine.Skip(s2, string.IsNullOrEmpty(rest) ? null : rest, "vom Nutzer übersprungen", mode);
                return skip.Message;
            case "add":
                if (Active() is not { } s3) return "Kein aktiver Workflow.";
                if (string.IsNullOrWhiteSpace(rest)) return "Nutzung: /workflow add <Titel>";
                return engine.Add(s3, rest).Message;
            case "abort":
                if (Active() is not { } s4) return "Kein aktiver Workflow.";
                engine.Abort(s4);
                return $"Workflow '{s4.Title}' abgebrochen.";
            default:
                return "workflow: list | resume [id] | next | skip [step] | add <titel> | abort";
        }
    }

    private async Task<string> HandleMoinAsync(SessionMode mode, CancellationToken ct)
    {
        if (mode == SessionMode.Autonomous) return "/moin ist ein interaktives Kommando und im Autopilot deaktiviert.";
        var status = await GitRunner.RunAsync(cwd, ["status", "--short", "--branch"], ct);
        var workflows = engine.List();
        var wfLines = workflows.Count == 0 ? "  (keine)" :
            string.Join("\n", workflows.Take(5).Select(s => $"  {s.Definition}/{s.Id} @ {s.CurrentStep}"));
        return $"☕ Moin! Stand:\n\nGit:\n{Indent(status.StdOut)}\n\nOffene Workflows:\n{wfLines}\n\n" +
               "Tagesplan: mit /workflow resume weitermachen oder /feature start \"…\" beginnen.";
    }

    private async Task<string> HandleCommitMsgAsync(CancellationToken ct)
    {
        var ado = Active()?.Ado;
        return await CommitComposer.ComposeAsync(cwd, ado, ct);
    }

    private async Task<ToolInvokeResult?> OnToolAsync(ToolInvokePayload payload, CancellationToken ct)
    {
        switch (payload.Name)
        {
            case "compose_commit_message":
                var msg = await CommitComposer.ComposeAsync(cwd, Active()?.Ado, ct);
                return new ToolInvokeResult(JsonSerializer.SerializeToElement(msg));
            case "deanonymize_text":
                var text = payload.Args.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "";
                return new ToolInvokeResult(JsonSerializer.SerializeToElement(pii.Deanonymize(text)));
            default:
                return new ToolInvokeResult(JsonSerializer.SerializeToElement($"unbekanntes Tool {payload.Name}"), IsError: true);
        }
    }

    private WorkflowState? Active() => engine.ActiveId() is { } id ? engine.Load(id) : null;

    private static string? ParseQuoted(string args, string afterKeyword)
    {
        var idx = args.IndexOf(afterKeyword, StringComparison.OrdinalIgnoreCase);
        var rest = idx >= 0 ? args[(idx + afterKeyword.Length)..].Trim() : args.Trim();
        rest = rest.Trim('"', '\'', ' ');
        return string.IsNullOrWhiteSpace(rest) ? null : rest;
    }

    private static string Slug(string s)
    {
        var slug = new string(s.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return slug.Trim('-')[..Math.Min(40, slug.Trim('-').Length)];
    }

    private static string Indent(string s) => string.Join("\n", s.Split('\n').Select(l => "  " + l));
}
