using System.Text.Json;
using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Backends;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Companions;
using Mkc.Copilot.Extensions.Core.Pii;
using Mkc.Copilot.Extensions.Core.Policy;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Workflow;
using Mkc.Copilot.Extensions.Core.Workflow.Meta;

namespace Mkc.Copilot.Extensions.Flow;

/// <summary>
/// mkc-work-flow: Workflows, Work-Konventionen, Local/Remote-Backend-Fassade, PII-Scrub (fail-open).
/// Phase 2: lokal (LocalBackend). Remote-Backends kommen in Phase 3 (SyncEngine).
/// </summary>
public sealed class FlowExtension(
    ModeContract modeContract, WorkflowEngine engine,
    BackendModeStore backendMode, PiiScrubber pii, string cwd,
    RemoteConfig remoteConfig, Func<PiiScrubber, IPlanningBackend?> adoFactory,
    GoalTracker goals, LoopRunner loop, BatchRunner batch, StateStore store,
    CompanionRegistry companions) : IExtensionHead
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
            new("goal", "Ziel mit prüfbaren Checks: set <text> | status | clear"),
            new("loop", "Iterieren Richtung Ziel: start [--max n] | status | stop"),
            new("simplify", "Deterministischer Vereinfachungs-Pass über den aktuellen Diff"),
            new("batch", "Task-Queue: add <task> | run | status | resume"),
            new("companions", "Optionale Token-Tools (caveman/graphify/headroom): list | enable <id> | disable <id>"),
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
        var activeCompanions = companions.Status(cwd).Where(c => c.Enabled).Select(c => c.Id).ToArray();
        if (activeCompanions.Length > 0) parts.Add("Aktive Token-Tools: " + string.Join(", ", activeCompanions));
        return new SessionStartResult(string.Join("\n", parts));
    }

    private Task<PostToolUseResult?> OnPostToolUseAsync(PostToolUsePayload payload, CancellationToken ct)
    {
        // TestsGreen-Gate: nach einem echten Test-Kommando den Exit-Code als Marker persistieren.
        var cmd = payload.ToolArgs.ValueKind == JsonValueKind.Object
                  && payload.ToolArgs.TryGetProperty("command", out var c) ? c.GetString() ?? "" : "";
        if (IsTestCommand(cmd))
        {
            // Exit-Code bevorzugt aus dem Result lesen; nur wenn nicht vorhanden auf Error/Failure zurückfallen.
            var exit = ExtractExitCode(payload.Result) ?? (payload.Error is null ? 0 : 1);
            File.WriteAllText(Path.Combine(store.RootDir, "last-test-exit"), exit.ToString());
        }
        return Task.FromResult<PostToolUseResult?>(null);
    }

    /// <summary>Erkennt Test-Runner am Kommando-Anfang (nach Ketten-Split), nicht per Substring.</summary>
    private static bool IsTestCommand(string cmd)
    {
        foreach (var argv in ShellCommandParser.Parse(cmd))
        {
            if (argv.Length == 0) continue;
            var tool = argv[0];
            var sub = argv.Length > 1 ? argv[1] : "";
            if ((tool is "dotnet" && sub == "test")
                || tool is "pytest" or "vitest" or "jest"
                || (tool is "npm" or "pnpm" or "yarn" && argv.Contains("test"))
                || (tool == "go" && sub == "test")
                || (tool == "cargo" && sub == "test"))
                return true;
        }
        return false;
    }

    private static int? ExtractExitCode(JsonElement? result)
    {
        if (result is not { ValueKind: JsonValueKind.Object } r) return null;
        foreach (var name in (string[])["exitCode", "exit_code", "code", "returnCode"])
            if (r.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number)
                return v.GetInt32();
        return null;
    }

    private async Task<CommandInvokeResult?> OnCommandAsync(CommandInvokePayload payload, CancellationToken ct)
    {
        var mode = modeContract.Read();
        var text = payload.Name switch
        {
            "mode" => await HandleModeAsync(payload.Args.Trim(), ct),
            "workflow" => await HandleWorkflowAsync(payload.Args.Trim(), mode, ct),
            "moin" => await HandleMoinAsync(mode, ct),
            "commitmsg" => await HandleCommitMsgAsync(ct),
            "feature" or "bugfix" or "doc" or "refactor" or "review" or "security" or "release"
                => await HandleStartAsync(payload.Name, payload.Args.Trim(), mode, ct),
            "goal" => await HandleGoalAsync(payload.Args.Trim(), ct),
            "loop" => await HandleLoopAsync(payload.Args.Trim(), ct),
            "simplify" => await HandleSimplifyAsync(ct),
            "batch" => HandleBatch(payload.Args.Trim()),
            "companions" => HandleCompanions(payload.Args.Trim()),
            _ => $"Unbekanntes Kommando: {payload.Name}",
        };
        return new CommandInvokeResult(text);
    }

    private async Task<string> HandleModeAsync(string arg, CancellationToken ct)
    {
        switch (arg)
        {
            case "local":
                backendMode.Write("local");
                return "Backend-Modus: local (dateibasiert).";
            case "remote":
                if (!remoteConfig.AdoComplete)
                    return "Remote nicht verfügbar. " + remoteConfig.MissingReport() + " — bleibe auf local.";
                var ado = adoFactory(pii);
                if (ado is null) return "ADO-Backend konnte nicht initialisiert werden — bleibe auf local.";
                backendMode.Write("remote");
                // Aktiven Workflow beim Wechsel nach remote pushen (idempotent).
                if (Active() is { } state)
                {
                    var sync = new SyncEngine(cwd, new LocalBackend(cwd), ado);
                    try
                    {
                        var outcome = await sync.PushAsync(state.Id, state.Title, ct);
                        if (outcome.AdoRef is not null) { state.Ado = outcome.AdoRef; engine.Save(state); }
                        return $"Backend-Modus: remote. {outcome.Message}";
                    }
                    catch (Exception ex)
                    {
                        backendMode.Write("local");
                        return $"Sync fehlgeschlagen ({ex.Message}) — bleibe auf local (fail-safe).";
                    }
                }
                return "Backend-Modus: remote.";
            default:
                return $"Backend-Modus: {backendMode.Read()}" +
                       (remoteConfig.AdoComplete ? "" : $" · {remoteConfig.MissingReport()}");
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

    // ---- Meta-Workflows ----

    private async Task<string> HandleGoalAsync(string args, CancellationToken ct)
    {
        var parts = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "status";
        switch (sub)
        {
            case "set":
                var text = parts.Length > 1 ? parts[1].Trim('"', ' ') : "";
                if (string.IsNullOrEmpty(text)) return "Nutzung: /goal set \"Ziel\" — danach Checks via 'dotnet test' etc. Standard-Check: dotnet test.";
                goals.Set(text, [new GoalCheck("dotnet test", 0)]);
                return $"Ziel gesetzt: {text}\nStandard-Check: 'dotnet test' (Exit 0). Anpassbar in .copilot/state/extensions/mkc/goal.json.";
            case "clear":
                goals.Clear();
                return "Ziel gelöscht.";
            default:
                var goal = goals.Current;
                if (goal is null || string.IsNullOrEmpty(goal.Text)) return "Kein Ziel gesetzt.";
                var results = await goals.EvaluateAsync(ct);
                var lines = results.Select(r => $"  {(r.Passed ? "✓" : "✗")} {r.Cmd} (exit {r.ExitCode})");
                return $"Ziel: {goal.Text}\nChecks:\n{string.Join("\n", lines)}";
        }
    }

    private async Task<string> HandleLoopAsync(string args, CancellationToken ct)
    {
        var parts = args.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "status";
        switch (sub)
        {
            case "start":
                var max = 5;
                var maxIdx = Array.IndexOf(parts, "--max");
                if (maxIdx >= 0 && maxIdx + 1 < parts.Length && int.TryParse(parts[maxIdx + 1], out var m)) max = m;
                if (goals.Current is null || string.IsNullOrEmpty(goals.Current.Text))
                    return "Kein Ziel gesetzt — zuerst /goal set \"…\".";
                loop.Start(max);
                return $"Loop gestartet (max {max} Iterationen) Richtung Ziel: {goals.Current.Text}. " +
                       "Arbeite; nach jedem Stillstand werden Checks + Fortschritt geprüft (/loop status).";
            case "stop":
                loop.Stop();
                return "Loop gestoppt.";
            default:
                return await EvaluateLoopAsync(ct);
        }
    }

    /// <summary>Wird von /loop status (und potenziell SessionIdle) aufgerufen: eine Iterations-Entscheidung.</summary>
    private async Task<string> EvaluateLoopAsync(CancellationToken ct)
    {
        var state = loop.Load();
        if (!state.Active) return "Kein aktiver Loop.";

        var allGreen = await goals.AllGreenAsync(ct);
        var errorOut = string.Join("\n", (await goals.EvaluateAsync(ct)).Where(r => !r.Passed).Select(r => r.Cmd + " exit " + r.ExitCode));
        var diffStat = (await GitRunner.RunAsync(cwd, ["diff", "--stat"], ct)).StdOut;
        var hash = ProgressHash.Compute(errorOut, diffStat);
        var budgetExhausted = false; // Budget lebt im Sentinel; hier konservativ false (Sentinel deny greift separat).

        var decision = loop.Decide(allGreen, hash, budgetExhausted);
        return decision.Injection is not null ? $"{decision.Message}\n{decision.Injection}" : decision.Message;
    }

    private async Task<string> HandleSimplifyAsync(CancellationToken ct)
    {
        var runner = new SimplifyRunner(cwd);
        var files = await runner.ChangedFilesAsync(ct);
        if (files.Count == 0) return "Keine geänderten Dateien im aktuellen Diff — nichts zu vereinfachen.";
        return $"Simplify-Pass über {files.Count} Datei(en):\n" +
               string.Join("\n", files.Select(f => $"  - {f}")) +
               "\n\nGehe Datei für Datei vor: vereinfachen ohne Verhaltensänderung, dann Tests. " +
               "Rote Datei via checkpoint zurückholen (mkc-work-sentinel: /checkpoint).";
    }

    private string HandleBatch(string args)
    {
        var parts = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "status";
        switch (sub)
        {
            case "add":
                if (parts.Length < 2) return "Nutzung: /batch add <Task-Beschreibung>";
                batch.Add(parts[1].Trim('"'));
                return $"Task hinzugefügt. {batch.Status()}";
            case "run":
            case "resume":
                var state = batch.Start();
                var current = batch.Current();
                return current is null
                    ? "Keine offenen Tasks."
                    : $"Batch {(sub == "resume" ? "fortgesetzt" : "gestartet")}. Aktueller Task: {current.Description}\n{batch.Status()}";
            default:
                return batch.Status();
        }
    }

    // ---- Optionale Companion-Integrationen (caveman/graphify/headroom) ----

    private string HandleCompanions(string args)
    {
        var parts = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var sub = parts.FirstOrDefault() ?? "list";
        var id = parts.Length > 1 ? parts[1].Trim() : "";

        switch (sub)
        {
            case "enable":
            case "disable":
                var companion = CompanionRegistry.Find(id);
                if (companion is null)
                    return $"Unbekannter Companion '{id}'. Verfügbar: {string.Join(", ", CompanionRegistry.Known.Select(c => c.Id))}.";
                companions.SetEnabled(companion.Id, sub == "enable");
                var detected = companions.Detect(companion, cwd);
                var hint = sub == "enable" && !detected ? $"\n  Noch nicht erkannt — Setup: {companion.SetupHint}" : "";
                return $"{companion.Name} {(sub == "enable" ? "aktiviert" : "deaktiviert")} (Präferenz). " +
                       $"Erkannt: {(detected ? "ja" : "nein")}.{hint}";
            default:
                var lines = companions.Status(cwd).Select(st =>
                {
                    var c = CompanionRegistry.Find(st.Id)!;
                    return $"  {(st.Enabled ? "[x]" : "[ ]")} {st.Id} ({c.Kind}) — {st.TokenEffect}" +
                           $"\n      erkannt: {(st.Detected ? "ja" : "nein")} · {c.Homepage}";
                });
                return "Optionale Token-Tools (Präferenz + Erkennung; Skills lädt die CLI selbst):\n" +
                       string.Join("\n", lines) +
                       "\n\nAn/Aus: /companions enable|disable <id>. Sie ergänzen die Extensions " +
                       "(caveman spart Output-, graphify Input-, headroom IO-Tokens) und werden nicht nachgebaut.";
        }
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
