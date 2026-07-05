# Copilot-CLI-Extensions — Finaler Plan (experimentell, Work-Welt, .NET)

> Status: **Geplant / experimentell** · Sprache der Implementierung: **C# / net10.0**
> Dieses Dokument ist der finale Implementierungsplan für die lokalen Copilot-CLI-Extensions
> (das `.github/extensions/`-System der CLI — **keine** MCP-Server, **keine** Copilot-Plugins,
> **keine** GitHub-App-Extensions). Architektur-Entscheidung: ADR-0010 (bei Umsetzung anzulegen).

---

## 0. Kontext

Das Monorepo enthält zwei Copilot-CLI-Marketplaces (Work + Home) mit prompt-basierten
Skills, Hooks und Agents. Die CLI bietet zusätzlich ein **lokales Extension-System**:
Verzeichnisse mit `extension.mjs` werden aus `~/.copilot/extensions/` (User-Scope) bzw.
`.github/extensions/` (Projekt-Scope) geladen, laufen als eigener Kindprozess und erhalten
über `joinSession()` die volle Harness-Oberfläche: Lifecycle-Hooks (`preToolUse`,
`postToolUse`, `userPromptSubmitted`, `sessionStart`, `sessionEnd`, `errorOccurred`),
eigene Tools, eigene Slash-Commands, UI-Elicitation-Dialoge, SystemMessage-Anpassung und
den Session-Event-Stream (inkl. `assistant.usage`- und `subagent.*`-Events). Verwaltung
in der Session via `/extensions list|enable|disable|reload|info`.

**Warum Extensions statt weiterer Skills/Hooks:** Skills sind Prompt-Hoffnung; Extensions
sind Code. Git-Guardrails, Secret-Scan, PII-Schutz, Budgets **und Arbeits-Workflows** werden
deterministisch, zustandsbehaftet (persistente Zähler, Cross-Turn-Memory, wiedereinsteigbare
State-Machines) und testbar (xUnit). **Leitprinzip: So viel wie möglich ist deterministisch
geskriptet — das LLM wird nur für die kreativen Lücken gerufen.**

### 0.1 Echte Extension — kein Overlay

Der CLI-Ladekontrakt ist fix: Eine Extension **ist** ein Verzeichnis mit `extension.mjs`.
Einen anderen Einstiegspunkt gibt es nicht — auch der offizielle Multi-Language-Weg
(Node/Python/Go/.NET-SDK, identische Oberfläche) führt über diesen Node-Einstieg.
Konsequenz für uns:

- `extension.mjs` ist ein **fester ~12-Zeilen-Stecker** (spawn + NDJSON-Weiterleitung),
  enthält **null Fachlogik** und ändert sich nach v1 praktisch nie.
- **Die Extension ist der .NET-Prozess.** Alle Hooks, Tools, Commands, Policies, Workflows,
  Dialoge: C#. Sollte die CLI später Binaries direkt laden können (oder das
  `GitHub.Copilot.SDK`-NuGet einen dokumentierten Connect-back bieten), entfällt nur der
  Stecker — Core und Heads bleiben unverändert (ADR-Offene-Frage: ForUri-Spike).

### 0.2 Protokoll-Ebenen (Klarstellung)

Es gibt **zwei getrennte Protokollebenen** — sie dürfen nicht vermischt werden:

| Ebene | Protokoll | Wer implementiert es |
|---|---|---|
| CLI ↔ Extension-Prozess (Stecker) | **JSON-RPC** der CLI, vollständig gekapselt durch `joinSession()` aus `@github/copilot-sdk` | Die CLI/das SDK. **Wir nie.** |
| Stecker ↔ .NET-Child | **`mkc-bridge/1`**: NDJSON-Envelope (§3) — **bewusst kein JSON-RPC 2.0** | Wir (Shim + `BridgeHost.cs`) |

Begründung für ein eigenes, schlankeres Envelope statt JSON-RPC 2.0 auf der zweiten Ebene:
wir brauchen weder Batch-Requests noch Notification-Semantik noch `error.data`-Konventionen;
ein flaches `{v,id,type,method,payload}` ist trivial zu golden-file-testen und in
System.Text.Json source-generierbar. Überall sonst im Dokument, wo „JSON-RPC" steht, ist
ausschließlich die **erste** Ebene gemeint.

### 0.3 SDK konsequent ausnutzen — so wenig eigene Infrastruktur wie möglich

Vor jeder Eigenentwicklung gilt: **Was die CLI/das SDK schon kann, bauen wir nicht.**
Stand der Recherche liefert die Plattform bereits:

| Plattform-Feature | Konsequenz für uns |
|---|---|
| Hooks, Tools, Commands, Elicitation, SystemMessage via `joinSession`-Registrierung | Shim registriert nur durch; keine eigene Dispatch-Logik Richtung CLI |
| **Deferred Tools** (`Defer=Auto`) | Unsere Tool-Fassade wird lazy geladen — Tool-Schemata kosten erst Tokens, wenn sie relevant werden |
| **Infinite Sessions + Compaction** (CLI-seitig) | Wir bauen keine eigene Kontextverwaltung; Recorder konsumiert nur Compaction-Events |
| **Memory** (persistente Erinnerung der CLI) | Kein Ersatz für unseren Workflow-State (der braucht Determinismus), aber genutzt für weiche Präferenzen |
| **`assistant.usage`-Events** (Tokens in/out/cached + Modell je API-Call) | Recorder rechnet exakt statt zu schätzen (§4.4) |
| **Custom Agents** (`.github/agents/`, `@agent-name`) + **`/fleet`** + `subagent.*`-Events | Fleet-Integration in §5.4 — wir orchestrieren nicht selbst, wir konfigurieren und messen |
| **Embedding-basiertes Context-Retrieval** (CLI lädt Extension-Kontext prompt-relevant) | Unsere SystemMessage-Sections klein und thematisch schneiden, damit Retrieval greift |
| Hot-Reload, `/extensions`-Verwaltung | Kein eigener Lifecycle-Manager |

Was wir **selbst** bauen, weil es echten Mehrwert liefert: deterministische Policy
(argv-Parser), Workflow-Engine mit persistentem Zustand, Backend-Fassade local↔remote,
Kosten-Attribution auf Workflows. **Schritt 0 der Umsetzung** (§9) ist ein erneuter
SDK-Check gegen die dann aktuelle Version — fällt etwas davon inzwischen ab, wird es gestrichen.

### 0.4 Fixierte Entscheidungen

| Frage | Entscheidung |
|---|---|
| Ort | Quellcode top-level `extensions/` im Monorepo (außerhalb der Marketplaces); Aktivierung **ausschließlich User-Scope** via Install-Skript nach `~/.copilot/extensions/`. **Kein** `.github/extensions/` in diesem Repo. |
| Schnitt | **4 Extensions**, einzeln via `/extensions enable\|disable` schaltbar, eine gemeinsame .NET-Core-Library: `mkc-work-guardian`, `mkc-work-sentinel`, **`mkc-work-flow`**, `mkc-work-recorder`. (Frühere Arbeitsbezeichnung `mkc-work-context` ist ersetzt — überall gilt `mkc-work-flow`.) |
| Remote-Zugriff | **Kein separater ADO-/Confluence-MCP.** Der Remote-Modus ruft Azure-DevOps- und Confluence-REST-APIs direkt aus .NET auf (deterministisch, PII-gescrubbt, PAT via `${env:…}`/OS-Keychain). Der Local-Modus arbeitet komplett dateibasiert. **Eine Tool-Fassade, zwei Backends** (§5.1). |
| Workflows | Token-optimierte Arbeitswege (keine CI!) über eine **generische, definitionsgetriebene Engine** (§5.2): Steps mit Metadaten, überall unterbrech-/wiedereinsteigbar, Steps überspringbar/einschiebbar, Moduswechsel local↔remote an jedem Schritt. Definitionen: feature, bugfix, refactor, doc, review, security, release + Meta-Workflows loop/goal/simplify/batch (§5.3). |
| Autopilot | „Härten + Budgets": autonom ⇒ harte Denies statt Rückfragen, Tool-/Datei-Budgets, automatische Checkpoints, riskante Ops verweigert; interaktiv ⇒ Elicitation-Dialoge (confirm/select) statt Denies |
| Welten | **Work-only** (`mkc-work-*`-Prefix). Home-Variante wäre später eine separate `mkc-home-*`-Extension; geteilt wird nur `Mkc.Copilot.Extensions.Core`. |
| Bridge | Fester Node-Stecker (`extension.mjs`, `joinSession`) ↔ .NET-Prozess über **`mkc-bridge/1`** (§0.2, §3); gesamte Logik in .NET |
| .NET | **net10.0** (C# 14), xUnit, System.Text.Json Source-Gen, `HttpClient` für REST, durchgängige `CancellationToken`-Disziplin — keine externen NuGets in v1. (Das net8.0-`dotnet-starter`-Template im meta-Plugin bleibt unberührt — anderes Artefakt.) |
| Kopplung | Extensions untereinander **nur** über State-Dateien (mode.json, denials.jsonl, current-workflow.json) — nie Direktaufrufe. Innerhalb eines Heads: **In-Process-EventBus** (§1) statt Modulaufrufe kreuz und quer. |

**Konsequenz aus „User-Scope only":** Die Extensions wirken in **allen** Projekten des Users.
Steuerung pro Projekt/Session über `/extensions disable <name>` bzw. Opt-out-Markerdatei
(§6.6, Mechanik 9). Dogfooding in diesem Repo über die User-Scope-Installation (Link-Modus).

---

## 1. Verzeichnis-Layout (alle neuen Dateien)

```
PersonalAgentPlugin/
├── extensions/                                   # NEU, top-level, Status: experimentell
│   ├── README.md                                 # DE, Experimentell-Banner, Install/Dev-Loop, /extensions-Nutzung
│   ├── versions.json                             # Pins: getestete copilot-CLI-Version, Bridge-Protokoll-Version
│   ├── .gitignore                                # host/*/bin/, dist-Artefakte
│   ├── Mkc.Copilot.Extensions.sln
│   ├── Directory.Build.props                     # net10.0, Nullable, TreatWarningsAsErrors, ReadyToRun, Version
│   ├── src/
│   │   ├── Mkc.Copilot.Extensions.Core/          # geteilte classlib
│   │   │   ├── Infrastructure/
│   │   │   │   ├── EventBus.cs                   # In-Process-Pub/Sub (System.Threading.Channels) — lose Kopplung der Module
│   │   │   │   └── Clock.cs                      # testbare Zeitquelle
│   │   │   ├── Bridge/
│   │   │   │   ├── BridgeHost.cs                 # stdin/stdout-Loop, id-Korrelation, Dispatch, Timeouts,
│   │   │   │   │                                 #   CancellationToken je Request; shutdown ⇒ Linked-Token bricht alles ab
│   │   │   │   ├── BridgeMessage.cs              # Envelope {v,id,type,method,payload} (mkc-bridge/1, §0.2)
│   │   │   │   ├── BridgeJsonContext.cs          # System.Text.Json Source-Gen
│   │   │   │   ├── HookPayloads.cs               # DTOs aller hook.*/tool.*/command.*/ui.*-Methoden
│   │   │   │   └── RegistrationManifest.cs       # hooks/tools/commands/systemMessage + status:"experimental" + defer-Flags
│   │   │   ├── Policy/
│   │   │   │   ├── ShellCommandParser.cs         # Tokenizer: &&, ;, |, sh -c, git -C, Quoting
│   │   │   │   ├── GitGuardrails.cs              # argv-basierte ADR-0004-Regeln (kein Substring-Match)
│   │   │   │   ├── ToolGuardian.cs               # Deny-Patterns (rm -rf, curl http:// …) als Code
│   │   │   │   ├── SecretScanner.cs              # Regex + Shannon-Entropie + Kontext-Keywords
│   │   │   │   ├── BranchNameLint.cs             # git-flow-Branch-Schema bei checkout/switch -b/-c
│   │   │   │   └── PolicyDecision.cs             # Allow / Deny / Confirm(+Deadline) + Reason + ModifiedArgs
│   │   │   ├── Autopilot/
│   │   │   │   ├── ModeDetector.cs               # State-Machine INTERACTIVE→SUSPECTED→AUTONOMOUS, Hysterese
│   │   │   │   └── ModeContract.cs               # Reader/Writer mode.json (atomic rename, TTL/Heartbeat)
│   │   │   ├── Workflow/
│   │   │   │   ├── WorkflowDefinition.cs         # deklaratives Modell: Steps als DAG + StepMeta (§5.2)
│   │   │   │   ├── StepMeta.cs                   # {id, title, kind, optional, skippable, autopilotAllowed, gates[], produces[]}
│   │   │   │   ├── WorkflowEngine.cs             # generischer Interpreter: Gates, Re-Entry, skip/insert, Cancellation
│   │   │   │   ├── WorkflowState.cs              # persistiert: workflows/<id>.json (Step-Pointer, Gate-Status, Artefakte, Links)
│   │   │   │   ├── Definitions/                  # FeatureFlow, BugfixFlow, RefactorFlow, DocFlow,
│   │   │   │   │                                 #   ReviewFlow, SecurityFlow, ReleaseFlow (Builder-API, §5.2)
│   │   │   │   └── Meta/                         # GoalTracker.cs, LoopRunner.cs, SimplifyRunner.cs, BatchRunner.cs (§5.3)
│   │   │   ├── Backends/
│   │   │   │   ├── IPlanningBackend.cs           # Fassade: Ticket-/Plan-/Doku-Operationen, backend-agnostisch (§5.1)
│   │   │   │   ├── LocalBackend.cs               # .copilot/planning/<id>/plan.md + notes.md, Status im Front-Matter
│   │   │   │   ├── AdoBackend.cs                 # ADO REST (WorkItems, PRs); PAT via env/Keychain; PII-Scrub vorab; CT-aware
│   │   │   │   ├── ConfluenceBackend.cs          # Confluence REST (Markdown→Storage-Format); CT-aware
│   │   │   │   └── SyncEngine.cs                 # local↔remote-Abgleich beim Moduswechsel, links.json-Mapping
│   │   │   ├── Telemetry/
│   │   │   │   ├── UsageAggregator.cs            # assistant.usage-Events → Tokens/Modell je Session & Workflow (§4.4)
│   │   │   │   ├── PriceTable.cs                 # prices.json (Modell → €/Credits je 1k in/out/cached), editierbar
│   │   │   │   └── DenyLog.cs                    # Schreiber (guardian/sentinel) + Leser (recorder): denials.jsonl
│   │   │   ├── State/
│   │   │   │   ├── StateStore.cs                 # <cwd>/.copilot/state/extensions/mkc/…, atomare JSON-Writes
│   │   │   │   ├── Budgets.cs                    # persistente Zähler (Tool-Calls, Writes, Shell, Denials)
│   │   │   │   └── Checkpointer.cs               # `git stash create` + Diff-Patch, Checkpoint-Index
│   │   │   └── Pii/
│   │   │       └── PiiScrubber.cs                # reversible Placeholder-Map; ersetzt den anonymizer-proxy im REST-Pfad
│   │   ├── Mkc.Copilot.Extensions.Guardian/      # Head 1 (Exe): Program.cs (+ --print-manifest), GuardianExtension.cs, DefaultPolicy.cs
│   │   ├── Mkc.Copilot.Extensions.Sentinel/      # Head 2 (Exe): SentinelExtension.cs (Mode/Budgets/Checkpoints)
│   │   ├── Mkc.Copilot.Extensions.Flow/          # Head 3 (Exe): FlowExtension.cs, WorkConventions.cs, CommitComposer.cs
│   │   └── Mkc.Copilot.Extensions.Recorder/      # Head 4 (Exe): RecorderExtension.cs, SessionReport.cs, CostReport.cs
│   ├── tests/Mkc.Copilot.Extensions.Tests/       # xUnit — Details §10
│   ├── host/                                     # Auslieferungs-Einheiten (genau das, was installiert wird)
│   │   ├── lib/bridge.mjs                        # EINZIGE Shim-Logik: spawn, NDJSON-Framing, Handshake,
│   │   │                                         #   Shadow-Copy-Spawn, Restart/Fail-Policy; joinSession injizierbar
│   │   ├── mkc-work-guardian/                    # extension.mjs (~12 Zeilen) + bridge.mjs (Einzeiler-Re-Export) + bin/ (gitignored)
│   │   ├── mkc-work-sentinel/   (dito)
│   │   ├── mkc-work-flow/       (dito)
│   │   └── mkc-work-recorder/   (dito)
│   ├── shim-test/
│   │   ├── mock-harness.test.mjs                 # Fake-joinSession + ECHTE .NET-Binaries: Skript-Dialoge
│   │   └── fixtures/                             # Golden-NDJSON (init→manifest→preToolUse→deny …)
│   └── install/
│       ├── install.sh / install.ps1              # publish + link|copy nach ~/.copilot/extensions/
│       └── uninstall.sh / uninstall.ps1
├── tools/validate-extensions.mjs                 # NEU (§7)
├── tools/test/validate-extensions.test.mjs       # NEU
├── docs/adr/0010-copilot-cli-extensions.md       # NEU (Format wie ADR-0004/0007)
├── docs/extensions-bridge-protocol.md            # NEU: kanonische Protokoll-Spec (mkc-bridge/1)
└── Änderungen: ARCHITECTURE.md (§1-Baum + neues §10) · README.md · package.json · .github/workflows/ci.yml
```

`dotnet publish` schreibt je Head nach `extensions/host/<name>/bin/` — dadurch ist
`host/<name>/` in **beiden** Install-Modi die vollständige, selbsttragende Einheit, und
`extension.mjs` löst das Binary immer einheitlich als `./bin/<Head>.dll` auf (Override: `MKC_EXT_BIN`).

**Cancellation-Disziplin (überall):** `BridgeHost` erzeugt pro eingehendem Request eine
`CancellationTokenSource` (Timeout-gebunden), verlinkt mit dem Prozess-Shutdown-Token.
`shutdown`, `/extensions reload`, Session-Ende oder Child-Dispose brechen laufende
Operationen (REST-Calls, git-Prozesse, Engine-Steps) sauber ab; alle async-APIs in Core
nehmen `CancellationToken` als letzten Parameter. Kein `Task.Run` ohne Token, kein
`.Result`/`.Wait()`.

---

## 2. Installer (User-Scope only)

`install.sh|ps1 [--mode link|copy] [--only <name,…>] [--with-recorder]`

- **Link-Modus (Default Linux/macOS, Dev-Loop):** `~/.copilot/extensions/<name>` → Symlink auf
  `<repo>/extensions/host/<name>/`. Node löst relative Imports über den **Realpath** des
  importierenden Moduls auf ⇒ der Einzeiler `bridge.mjs` (Re-Export von `../lib/bridge.mjs`)
  funktioniert durch den Symlink hindurch. Vorteil: `dotnet publish` + `/extensions reload`
  = neuer Code aktiv, keine Re-Installation.
- **Copy-Modus (stabile Installation, Default-Empfehlung Windows):** Installer kopiert
  `host/<name>/` komplett und **ersetzt** dabei den Einzeiler `bridge.mjs` durch den vollen
  Inhalt von `host/lib/bridge.mjs` (materialisieren statt Import-Rewrite). Ergebnis ist
  selbsttragend, ohne Repo-Abhängigkeit.
- **Windows:** Symlinks erfordern Developer-Mode/Admin ⇒ `install.ps1` nutzt im Link-Modus
  **Directory Junctions** (`New-Item -ItemType Junction`, kein Admin nötig).
- **Hot-Reload × Links × Windows-File-Locks:** Der laufende .NET-Child sperrt seine DLLs;
  `dotnet publish` in `bin/` würde auf Windows scheitern. Lösung im Shim: **Shadow-Copy-Spawn**
  — `bridge.mjs` kopiert `bin/` vor dem Spawn in ein Session-Temp-Verzeichnis und startet von
  dort (`MKC_NO_SHADOW=1` schaltet ab). `/extensions reload` → Shim-Dispose → `shutdown` an
  Child (Cancellation aller laufenden Ops) → Respawn mit frischer Shadow-Copy des neuen `bin/`.
- **Default-Auswahl:** guardian + sentinel + flow; recorder nur mit `--with-recorder`
  (Telemetrie ist Opt-in). `uninstall` entfernt Links/Kopien und lässt projektlokalen State
  (`.copilot/state/extensions/mkc/` und `.copilot/planning/`) unangetastet.

---

## 3. Bridge: Mechanismus + JSON-Lines-Protokoll `mkc-bridge/1`

**Entscheidung:** Fester Stecker mit `joinSession` als einziger Kontakt zur dokumentierten
Extension-Oberfläche (Ebene 1, §0.2); der .NET-Prozess ist ein reines stdin/stdout-Programm
und trägt die gesamte Logik. Begründung: Testbarkeit ohne CLI (Mock-Harness), Hot-Reload
trivial, keine Abhängigkeit von undokumentiertem `ForUri`-Token-Plumbing, minimale
Angriffsfläche (keine NuGet-Fremdpakete). NuGet `GitHub.Copilot.SDK` wird in v1 **nicht**
referenziert; Migrationspfad (Stecker entfällt, Heads auf natives SDK) im ADR als Offene Frage.

Transport (Ebene 2): **NDJSON** (1 Objekt/Zeile, UTF-8) auf stdin/stdout; **stderr = Logs**. Envelope:

```json
{ "v": 1, "id": "<uuid | null bei event>", "type": "req|res|event", "method": "<ns.name>", "payload": { } }
```

Antwort: `{"v":1,"id":"…","type":"res","ok":true,"payload":{…}}` bzw.
`"ok":false,"error":{"code","message"}`. Voll-duplex, id-korreliert.

**Handshake:**
1. Shim spawnt Child mit ENV `MKC_BRIDGE_V=1`, `MKC_EXT_NAME`, `MKC_STATE_DIR`
   (= `<cwd>/.copilot/state/extensions/mkc/`), `MKC_SESSION_ID`, `MKC_CWD`.
2. Child → `event ready {name, version, protocol:1}` (10-s-Timeout).
3. Shim → `req init {sessionId, cwd, cliVersion, capabilities[]}` (capabilities per
   Feature-Detection der `joinSession`-Optionen); Child antwortet mit **RegistrationManifest**
   `{status:"experimental", hooks[], tools[{name,description,inputSchema,skipPermission?,defer?}],
   commands[{name,description}], agents?[…], systemMessage{mode:"append",sections[]},
   wantsPermissionFlow, wantsSessionEvents[]}`; Shim registriert exakt das bei `joinSession`
   und forwarded alle Handler. Tools werden wo möglich mit `defer` registriert (§0.3).

**Shim → Child (`req`, mit Timeout + Fail-Policy; Timeout ⇒ Cancellation des Requests im Child):**

| method | payload | response | Timeout |
|---|---|---|---|
| `hook.preToolUse` | `{toolName, toolArgs, turn}` | `{permissionDecision?:"allow"\|"deny", permissionDecisionReason?, modifiedArgs?, additionalContext?}` | 2000 ms |
| `hook.postToolUse` / `hook.postToolUseFailure` | `{toolName, toolArgs, result\|error, durationMs}` | `{additionalContext?}` | 2000 ms |
| `hook.userPromptSubmitted` | `{prompt}` | `{modifiedPrompt?, additionalContext?}` | 1500 ms |
| `hook.sessionStart` | `{resumed}` | `{additionalContext?}` | 3000 ms |
| `hook.sessionEnd` | `{reason}` | `{}` | 3000 ms |
| `hook.errorOccurred` | `{error, attempt}` | `{action:"retry"\|"skip"\|"abort"}` | 1500 ms |
| `permission.request` | `{request}` roh | `{decision:"allow"\|"deny"\|"pass", reason?}` | 2000 ms |
| `tool.invoke` | `{name, args, invocationId}` | `{result, isError?}` | 60 s |
| `command.invoke` | `{name, args}` | `{text}` | 60 s |
| `shutdown` | `{}` | `{}`; Child cancelt laufende Ops, flusht, exit 0; Kill nach 3 s | 3000 ms |

**Shim → Child (`event`, fire-and-forget):** `event.session {kind, data}` mit
`kind ∈ {UserMessage, AssistantMessage(Delta), AssistantUsage, ToolExecutionStart/Complete,
SessionIdle, Compaction, SubagentStarted/Completed/Failed, …}` — nur die per
`wantsSessionEvents` abonnierten.

**Child → Shim (`req`, verschachtelt erlaubt):**
`ui.confirm {title,message,timeoutMs?}` → `{confirmed, timedOut?}` ·
`ui.select {message,options[]}` → `{choice}` · `ui.input {message}` → `{value}` ·
`ui.elicit {schema}` → `{value}` (Mapping auf `session.Ui.*`; nicht beantwortete Dialoge meldet
der Shim nach `timeoutMs` als `timedOut:true` zurück — Grundlage der Confirm-Deadline-Mechanik).

**Fail-Policy im Shim (pro Extension konfiguriert):** kaputte Zeile ⇒ stderr + ignorieren.
Child-Crash ⇒ 1 Restart mit Backoff, danach: `failMode:"closed"` (guardian, sentinel) = Shim
beantwortet `preToolUse`/`permission.request` selbst mit `deny`; `failMode:"open"`
(flow, recorder) = Hooks werden No-Ops. Timeout einer Guardian-/Sentinel-`preToolUse` ⇒ `deny`.
**Normalisierung:** `toolName`/`tool_name`-Payload-Varianten normalisiert der Shim; das
Bridge-Protokoll ist die stabile Grenze.

---

## 4. Der 4er-Schnitt: Hooks/Tools/Commands + Autopilot-Verhalten

**Architektur-Prinzip:** Alle vier Extensions registrieren ihre eigenen Hooks; die CLI führt
die `preToolUse`-Hooks **aller** aktiven Extensions aus, und **jedes Deny gewinnt** —
Enforcement braucht **keine** IPC im heißen Pfad. Extensions koppeln untereinander **nur über
State-Dateien**: `mode.json` (Sentinel schreibt, TTL 5 min, **stale ⇒ `autonomous`**, also
fail-strict), `denials.jsonl` (guardian/sentinel schreiben, recorder liest),
`current-workflow.json` (flow schreibt, recorder liest zur Kosten-Attribution). Ist der
Sentinel deaktiviert, fängt die **Confirm-Deadline** (§6.6, Mechanik 4) Autopilot trotzdem ab.

### 4.1 `mkc-work-guardian` — deterministische Policy als Code (fail-closed)

- **Hooks:** `preToolUse` (Git-Guardrails argv-basiert nach ADR-0004 inkl.
  `--force-with-lease`-Ausnahme; Tool-Guardian-Denylist; Secret-Scan auf Args;
  Branch-Name-Lint), `postToolUse` (Secret-/PII-Scan auf Tool-Output → Warn-`additionalContext`),
  `sessionStart`/`sessionEnd`. Jedes Deny → `denials.jsonl` `{ts, rule, tool, argsDigest, mode, auto}`.
- **Commands:** `/guardian` (`status` · `why` · `policy`).
- **Tools:** keine. Policy: `DefaultPolicy.cs` eingebettet, Override via
  `~/.copilot/extensions/mkc-work-guardian/policy.json`.
- **Autopilot:** `autonomous` ⇒ jede Confirm-Stufe wird **deny** („[GATE] nur interaktiv");
  `interactive` ⇒ Grenzfälle lösen `ui.confirm` aus; Hard-Deny-Liste bleibt in jedem Modus deny.

### 4.2 `mkc-work-sentinel` — Mode-Detection, Budgets, Checkpoints (fail-closed)

- **Hooks:** `preToolUse` (Budget-Enforcement; im Autopilot Checkpoint-Pflicht vor der ersten
  mutierenden Op eines Turns), `errorOccurred` (max 2 Retries, im Autopilot danach `abort`),
  `sessionStart`/`sessionEnd`; `permission.request` (Detektions-Signal); Session-Events
  `UserMessage`, `ToolExecutionStart/Complete`, `SessionIdle`.
- **Commands:** `/autopilot` (`on|off|auto|status`), `/budget` (`show|set <key> <n>`),
  `/checkpoint` (`list|create`).
- **Detektion (ModeDetector, Hysterese):** Signal A `/autopilot on|off` (autoritativ) ·
  Signal B ≥3 aufeinanderfolgende `ToolExecutionStart` ohne `permission.request` ⇒ SUSPECTED,
  weitere 3 ⇒ AUTONOMOUS · Signal C `UserMessage`/Permission-Antwort mit Latenz >1,5 s ⇒
  Abstieg um eine Stufe. Schreibt `mode.json` mit Heartbeat.
- **Autopilot:** Kern der Extension — härtet (Budgets, Checkpoint-Pflicht, Retry→Abort);
  interaktiv nur Beobachtung + Warnschwellen.

### 4.3 `mkc-work-flow` — Workflows, Work-Konventionen & Backend-Modi (fail-open)

Der Arbeits-Kern (Detail in §5 und §6):

- **Hooks:** `userPromptSubmitted` (PII-Scrub: Email/ADO-UPN/FullName/PhoneDE → reversible
  Platzhalter; IBAN/SteuerID → Redaktion), `sessionStart` (Re-Entry: aktive Workflows +
  Backend-Modus + Branch→Ticket als **ein kompakter Kontextblock**), `postToolUse`
  (Gate-Fortschritt deterministisch registrieren: Tests gelaufen? Commit da?).
- **SystemMessage:** Append-Section `mkc-work-conventions` — klein und thematisch geschnitten
  (Embedding-Retrieval, §0.3), deterministisch aus Repo-Zustand generiert.
- **Commands:** `/mode` (`status|local|remote`) ·
  `/workflow` (`list|resume [id]|next|skip [step]|add <step>|abort`) ·
  `/feature|/bugfix|/refactor|/doc|/review|/security|/release start "…"` ·
  `/goal` (`set|status|clear`) · `/loop` (`start|status|stop`) · `/simplify` · `/batch`
  (`add|run|status|resume`) · `/moin` · `/commitmsg`.
- **Tools (Fassade, beide Modi identisch, defer-registriert):** `planning_read`,
  `planning_write`, `doc_draft`, `doc_publish`, `compose_commit_message`,
  `deanonymize_text` (SkipPermission, rein lokal).
- **Custom Agents (v2, §5.4):** registriert Work-Personas (reviewer read-only,
  documenter drafts-only …) analog AGENTS.md §2.2 für `/fleet`-Nutzung.
- **Autopilot:** `interactive` ⇒ Dialoge (PII-Wahl, Sync-Konflikte, Step-Bestätigung);
  `autonomous` ⇒ stille harte Redaktion, **kein** `doc_publish`/WorkItem-Write nach remote
  (nur lokale Drafts), kein Skip von Pflicht-Steps, `/moin` verweigert sich.

### 4.4 `mkc-work-recorder` — Telemetrie, Kosten, Analytik (fail-open, Opt-in)

Nicht nur Logs — **vollständige Telemetrie mit Kosten-Attribution**:

- **Quellen:** `assistant.usage`-Events (Tokens in/out/cached + Modell je API-Call — die CLI
  liefert das im Event-Stream, wir rechnen exakt statt zu schätzen) · `ToolExecutionStart/
  Complete` (Latenzen) · Compaction-Events · `SubagentStarted/Completed/Failed` (Fleet-Kosten
  je Subagent) · `denials.jsonl` (Guardian/Sentinel-Denies inkl. `auto`-Flag: automatisch vs.
  nach Dialog) · `current-workflow.json` (Attribution: welcher Workflow war zum Zeitpunkt aktiv).
- **Verarbeitung:** `UsageAggregator` schreibt `usage.jsonl` (Rohdaten) und aggregiert je
  **Session** und je **Workflow-Instanz**: Tokens pro Modell, Kosten via `PriceTable`
  (`prices.json`: Modell → Preis je 1k input/output/cached; editierbar, mit Stand-Datum),
  Deny-Zähler (automatisch/interaktiv, je Regel), Turn-Zahl, Tool-Latenz-Histogramm,
  Compaction-Häufigkeit. Fehlt das usage-Event in einer CLI-Version, wird auf Zeichen-basierte
  Schätzung zurückgefallen und jede Zahl als **„geschätzt"** markiert.
- **Commands:** `/flightlog` (`last` · `report` → Markdown-Artefakt nach
  `.copilot/state/artifacts/flight-<ts>.md`) · `/flightlog costs [session|workflow <id>]`
  („Was hat mich feature/AB#1234 gekostet — gesamt und je Modell?") · `/flightlog models`
  (welche Modelle, wie oft, mit welchem Token-Anteil) · `/flightlog denies`
  (wie oft wurde automatisch verweigert, welche Regeln feuern am meisten).
- **Autopilot:** `autonomous` ⇒ Voll-Capture inkl. Argument-Digests + Checkpoint-Korrelation;
  `interactive` ⇒ gesampelt und schlanker.
- **Später (Offene Frage):** OTLP-Export der Aggregatdaten.

---

## 5. Workflow-System

### 5.1 Eine Tool-Fassade, zwei Backends (local ↔ remote)

`IPlanningBackend` definiert die fachlichen Operationen backend-agnostisch:

| Operation | Local-Backend | Remote-Backend |
|---|---|---|
| `GetTicket` / `CreateTicket` / `UpdateStatus` | `.copilot/planning/<id>/plan.md` (YAML-Front-Matter) | ADO REST WorkItems |
| `ReadPlan` / `WritePlan` | `plan.md`-Body | WorkItem-Description/Comments |
| `DraftDoc` / `PublishDoc` | `notes.md` → optional `docs/` | Confluence REST |
| `CreatePr` / `GetPrStatus` | lokale Checkliste in `plan.md` | ADO REST Pull Requests |

Das LLM sieht in beiden Modi **exakt dieselben Tools** — der Moduswechsel (`/mode local|remote`,
an jeder Stelle, in beide Richtungen) ist für das Modell unsichtbar; kein Kontext wird
invalidiert. **Deshalb kein ADO-/Confluence-MCP:** REST deterministisch in C#, PII-Scrub vor
jedem Call, Antworten als kompakte Digests. Sync beim Wechsel über `SyncEngine` +
`links.json`-Mapping (idempotent); Konflikte: interaktiv `ui.select`, autonom fail-safe lokal.
Kein Token konfiguriert ⇒ `/mode remote` erklärt, was fehlt, und bleibt auf local.

### 5.2 Generische Workflow-Engine (keine harte Step-Kette)

Die Engine ist ein **Interpreter über deklarative Definitionen**, keine fest verdrahtete
State-Machine — dieselbe Engine trägt Feature-, Bugfix-, Refactoring-, Doku-, Review-,
Security- und Release-Workflows (die Workflows des orchestration-Plugins — /feature, /bugfix,
/review-flow, /ship — gehen hier nicht verloren, sie werden deterministisch):

```csharp
// Builder-API (Definitions/FeatureFlow.cs, gekürzt)
Workflow.Define("feature")
  .Step("ticket",   kind: Planning,  optional: false, gates: [BacklogLinked])
  .Step("plan",     kind: Planning,  optional: false, gates: [PlanFilled])
  .Step("branch",   kind: Git,       optional: false, gates: [BranchConform])
  .Step("implement",kind: Dev,       gates: [HasCommits])
  .Step("test",     kind: Quality,   gates: [TestsGreen],     autopilotAllowed: true)
  .Step("review",   kind: Quality,   optional: true,  after: "test")
  .Step("ship",     kind: Release,   gates: [PrCreatedOrChecklist])
  .Step("doc",      kind: Doc,       optional: true,  skippable: true);
```

- **Step-Metadaten** (`StepMeta`): `id`, `title`, `kind`, `optional`, `skippable`,
  `autopilotAllowed`, `gates[]`, `produces[]`, `after` (DAG-Kante). Dadurch sind gezielt
  Steps **überspringbar** (`/workflow skip doc` — nur wenn `skippable`), **einschiebbar**
  (`/workflow add spike "API evaluieren"` als Ad-hoc-Step vor dem aktuellen) und
  reihenfolge-flexibel, ohne die Engine anzufassen.
- **Gates prüft Code** (Exit-Codes, git-Zustand, Datei-Existenz) — nie das Modell.
  Pflicht-Gates (z. B. `TestsGreen`) sind im Autopilot **nicht** skippable; interaktiv
  fragt `/workflow skip test` per `ui.confirm` nach.
- **Zustand** je Instanz in `workflows/<id>.json` (Step-Pointer, Gate-Status, Skips mit
  Begründung, Artefakte, Backend-Links). **Re-Entry:** neue Session ⇒ `sessionStart`
  injiziert einen kompakten Kontextblock; `/workflow resume` setzt exakt am Pointer auf —
  der Zustand ist die Wahrheit, nicht der Chatverlauf (größter Token-Hebel).
- **Token-Prinzipien:** Digests statt Rohdumps · Code-generierte Artefakte (Skeletons,
  Commit-Messages, PR-Texte), LLM füllt markierte Lücken · step-genau injizierter Kontext ·
  defer-registrierte Tools.

### 5.3 Meta-Workflows: Loop, Goal, Simplify, Batch — „nachgebaut, so dass sie wirklich funktionieren"

Alle vier laufen über dieselbe Engine + Sentinel-Budgets und sind deterministisch terminiert:

- **`/goal set "<Ziel>"`** — legt `goal.json` an: Zieltext + **prüfbare Akzeptanz-Checks**
  (Kommandos mit Exit-Code, z. B. `dotnet test`, `grep`-Assertions), interaktiv per Dialog
  erfasst. Ab dann injiziert flow pro Turn eine Ein-Zeilen-Zielerinnerung + Check-Status.
  `/goal status` führt die Checks aus und zeigt rot/grün. Das Ziel „driftet" nicht mehr weg,
  weil es außerhalb des Kontextfensters persistiert ist.
- **`/loop start [--max <n>]`** — iteriert Richtung Goal: pro Iteration (1) Checkpoint,
  (2) kompakter Zustands-Digest als Prompt-Injektion, (3) Agent arbeitet, (4) Gates/Checks
  laufen. **Terminierung deterministisch:** alle Checks grün ∨ `max` Iterationen ∨
  Sentinel-Budget erschöpft ∨ **No-Progress-Erkennung** (Hash über Fehlerbild/Diff zweimal
  identisch ⇒ Stopp + Report statt Endlosschleife). Jede Iteration im Recorder als eigene
  Kosten-Zeile.
- **`/simplify`** — deterministischer Vereinfachungs-Pass über den aktuellen Diff:
  Code sammelt `git diff`, zerlegt pro Datei, ruft das LLM je Datei mit engem Auftrag
  („vereinfachen ohne Verhaltensänderung"), danach Gate `TestsGreen` — schlägt es fehl,
  wird **nur diese Datei** aus dem Checkpoint zurückgeholt. Abschluss-Report: was wurde
  vereinfacht, was zurückgerollt.
- **`/batch add "<task>"` … `/batch run`** — persistente Task-Queue (`batch.json`):
  Tasks laufen sequenziell im Autopilot, je Task Checkpoint + Budget-Scheibe + Ergebnis-Log;
  `/batch status|resume` (Queue-Pointer persistiert — abbrechbar und wiederaufnehmbar).
  Abschluss: Markdown-Report mit Kosten je Task (Recorder). **v2:** `/batch run --fleet`
  mappt unabhängige Tasks auf `/fleet`-Subagents (§5.4).

### 5.4 Fleet & Custom Agents (v2)

Die CLI kann mit `/fleet` einen Plan in unabhängige Subtasks zerlegen und parallel von
Subagents abarbeiten lassen; Custom Agents (`.github/agents/`, `@agent-name`) geben den
Subagents Spezialisierung (eigener Systemprompt, Tool-Restriktionen). Unser Hebel — wir
orchestrieren **nicht** selbst, wir konfigurieren und messen:

- flow registriert/pflegt Work-Personas als Custom Agents mit Write-Scopes analog
  AGENTS.md §2.2 (reviewer: read-only; documenter: nur Drafts; tester: edit+execute).
- Guardian-Hooks wirken harness-weit — auch auf Subagent-Tool-Calls (im Dogfooding zu
  verifizieren, ADR-Offene-Frage).
- `/batch run --fleet`: unabhängige Batch-Tasks als Fleet-Subtasks; Recorder attribuiert
  Kosten je Subagent über `subagent.*`- + usage-Events.
- Sentinel-Budgets gelten global über alle Subagents (ein Budget-Topf pro Session).

### 5.5 Koexistenz mit Skills & Plugins (z. B. Caveman)

Extensions ersetzen das Skill-/Plugin-System **nicht** — die CLI lädt beides unabhängig in
dieselbe Session. Ein Skill wie **Caveman** (reduziert Antwort-Tokens um ~75 % durch
Weglassen von Füllwörtern bei erhaltener technischer Präzision, Intensitätsstufen,
auto-triggernd) ist **später jederzeit zusätzlich nutzbar — keine Integration nötig**.
Er ist sogar komplementär: unsere Extensions minimieren **Input**-Tokens (Digests,
Re-Entry-State, defer-Tools), Caveman minimiert **Output**-Tokens. Einzige Regel:
Extensions bleiben skill-agnostisch (keine Annahmen über Antwortstil in Gates/Parsing —
Gates lesen Exit-Codes, nie Modelltext).

---

## 6. Funktionalität & Benutzung (Walkthrough)

**Session-Start.** `copilot` in einem Work-Projekt: flow meldet Backend-Modus, aktive
Workflows mit Step, Branch→Ticket in einem Kontextblock. Guardian/Sentinel sind still,
bis etwas passiert.

**Morgens:** `/moin` → Workday-Report aus Code (git-Status, offene Workflows, Checkpoints).

**Feature beginnen:** `/feature start "CSV-Export"` → Dialog local/remote-Ticket →
Code erzeugt plan.md-Skeleton + git-flow-konformen Branch-Vorschlag + Workflow-State;
das LLM füllt einmalig die Plan-Lücken aus einem Digest.

**Arbeiten:** normal mit dem Agenten. Guardian blockt deterministisch (`/guardian why`
erklärt), Sentinel zählt Budgets, flow registriert Gate-Fortschritt. `/workflow next`
schaltet erst bei erfüllten Gates weiter — sonst sagt es präzise, was fehlt.
`/commitmsg` baut die Conventional-Commit-Message mit AB#-Ref aus dem staged Diff.

**Doku überspringen / Zwischenschritte:** `/workflow skip doc` (doc ist `skippable`) —
der Skip wird mit Begründung im State protokolliert. `/workflow add spike "Lib evaluieren"`
schiebt einen Ad-hoc-Step ein. Pflicht-Gates (Tests) sind nur interaktiv nach Rückfrage
überspringbar, im Autopilot nie.

**Moduswechsel mittendrin:** `/mode local` (z. B. offline) → SyncEngine snapshottet
WorkItem/Seiten lokal; später `/mode remote` → Abgleich-Dialog. Step-Pointer bleibt stehen.

**Ziel & Loop:** `/goal set "Alle Exporte streamen statt puffern"` (mit Checks) →
`/loop start --max 5` → Iterationen mit Checkpoints bis Checks grün oder Abbruchkriterium;
`/flightlog costs workflow <id>` zeigt danach, was der Loop gekostet hat.

**Unterbrechen & Wiedereinsteigen:** Tage später, andere Maschine: `/workflow list` →
`/workflow resume ab1234` → ein kompakter Kontextblock, exakt am Step-Pointer weiter.

**Autopilot:** `/autopilot on` (oder Heuristik) → Denies statt Dialoge, Checkpoint-Pflicht,
Budget-Stopps, kein Remote-Publish, kein Pflicht-Skip. Zurück interaktiv → liegengebliebene
Publish-Schritte werden angeboten.

**Auswertung:** `/flightlog costs` (Session/Workflow, je Modell) · `/flightlog models` ·
`/flightlog denies` (wie oft automatisch verweigert, welche Regeln) · `/flightlog report`.

### 6.6 Clevere Mechaniken (deterministisch statt Prompt-Hoffnung)

1. **Echter Shell/git-argv-Parser** (Ketten, `sh -c`, Quoting, `-f` vs. `--force-with-lease`)
   — schließt die Offene Frage aus ADR-0004.
2. **Persistente Budgets** (atomare JSON-Writes, `/budget show`).
3. **Checkpoints ohne Working-Tree-Berührung** (`git stash create` + Diff-Patch).
4. **Confirm-Deadline:** `ui.confirm` mit `timeoutMs` (60 s); keine Antwort ⇒ deny —
   autopilot-sicher auch ohne Sentinel.
5. **Mode-Contract stale-fails-strict** (TTL ⇒ `autonomous`).
6. **Entropie-basierter Secret-Scan** auf Args und Tool-Output.
7. **Reversible PII-Platzhalter-Map** + lokales `deanonymize_text`; Scrub vor jedem REST-Call.
8. **Wiederholungs-Gedächtnis:** 3× identischer Deny ⇒ eskalierender Kontext; Autopilot ⇒ abort.
9. **Projekt-Opt-out-Marker** `.copilot/mkc-extensions.json` `{"disable":[…]}`.
10. **Deterministische SystemMessage aus Repo-Zustand.**
11. **Backend-unsichtbare Tool-Fassade** — Moduswechsel ohne Kontext-Invalidierung.
12. **Workflow-Zustand als Wahrheit** — Re-Entry über State statt Chatverlauf.
13. **No-Progress-Erkennung im Loop** (Fehlerbild-Hash) — kein Kreisdrehen.
14. **Exakte Kosten-Attribution** (usage-Events × current-workflow.json) — jeder Workflow
    bekommt eine Rechnung.
15. **In-Process-EventBus** (Channels) — Module innerhalb eines Heads lose gekoppelt,
    Extensions untereinander nur über State-Dateien.

---

## 7. Validierung & CI

**`tools/validate-extensions.mjs`** (Findings-Tiers aus `tools/lib/` wiederverwendet):
scannt `extensions/host/*` — `extension.mjs` vorhanden + `node --check`; `bridge.mjs`-Einzeiler
konsistent mit `host/lib/bridge.mjs`; Manifest-Kontrakt via
`dotnet run --project … -- --print-manifest` (offline): Schema-Check (hooks ∈ bekannter Menge,
gültige inputSchemas, `status:"experimental"`), ohne .NET SDK ⇒ warning statt error;
Versions-Konsistenz `versions.json` ↔ `bridge.mjs` ↔ `BridgeMessage.cs`.

**`package.json`:** `"validate:extensions"`, `"test:extensions"` (dotnet-guarded), in `npm test`.

**`.github/workflows/ci.yml`** — neuer Job `extensions`: `actions/setup-dotnet@v4` (**10.0.x**)
→ `dotnet build extensions -warnaserror` → `dotnet test extensions` → `dotnet publish` aller
Heads → `node tools/validate-extensions.mjs` → `node --test extensions/shim-test/`.
**Nicht** `continue-on-error`. Nebenbefund mitfixen: bestehender Step referenziert
nicht existierendes `mcp-servers/dotnet-mcpserver-starter`.

---

## 8. Docs (deutsch)

1. **`docs/adr/0010-copilot-cli-extensions.md`** (Format wie ADR-0004/0007). Entscheidungen:
   Ort + User-Scope-only; Zwei-Ebenen-Protokoll (§0.2) mit Begründung gegen JSON-RPC 2.0 auf
   Ebene 2; 4er-Schnitt + State-Datei-Kopplung; Autopilot-Policy; native REST-Backends statt
   ADO-/Confluence-MCP; generische Engine + Meta-Workflows; net10.0; Welt-Bindung.
   Offene Fragen: ForUri-Spike, SDK-Drift, Fleet-Verhalten der Guardian-Hooks auf Subagents,
   Konsolidierung mit `hooks.json`-Guards + anonymizer-proxy-Pfad, OTLP-Export, Home-Variante.
2. **`docs/extensions-bridge-protocol.md`** — kanonische Spec aus §3.
3. **`ARCHITECTURE.md`** §10 neu · **`README.md`** · **`extensions/README.md`**
   (Experimentell-Banner, getestete CLI-Version).

---

## 9. Implementierungs-Reihenfolge (phasenweise gegen Komplexität)

0. **SDK-Re-Check** gegen aktuelle CLI/SDK-Version: Was aus §0.3 ist inzwischen eingebaut?
   (Streichen schlägt Bauen.) Capabilities-Feature-Detection festzurren.
1. **v1.0 Sicherheitskern:** Gerüst (sln, props net10.0, Core, Tests) + ADR-0010 +
   Protokoll-Doc; Policy-Module (Parser, Guardrails, Guardian, SecretScanner) + Budgets +
   ModeDetector + Checkpointer, voll getestet; Bridge + `host/lib/bridge.mjs` +
   Mock-Harness; Heads guardian + sentinel; Installer; Dogfooding.
2. **v1.1 Flow lokal:** EventBus, generische Engine + StepMeta, Definitionen feature/bugfix/doc,
   LocalBackend, PII-Scrub, `/moin`, `/commitmsg`, Re-Entry.
3. **v1.2 Remote & Sync:** AdoBackend, ConfluenceBackend, SyncEngine, `/mode`,
   restliche Definitionen (refactor/review/security/release).
4. **v1.3 Meta-Workflows:** GoalTracker, LoopRunner, SimplifyRunner, BatchRunner.
5. **v1.4 Recorder-Telemetrie:** UsageAggregator, PriceTable, DenyLog-Auswertung,
   `/flightlog`-Familie.
6. **v2:** Fleet/Custom Agents, `/batch --fleet`, OTLP, ForUri-Spike.
Jede Phase endet mit grünem CI + Dogfooding-Woche, bevor die nächste beginnt.

---

## 10. Verifikationsplan

1. **Unit (`dotnet test extensions`):** Parser-Umgehungen (`sh -c "git push -f"`,
   `a && git reset --hard`), Entropie-Scan, PII-Roundtrip, Mode-Sequenzen, Budget-Persistenz,
   Checkpointer (temp-git-Repo), **WorkflowEngine** (Gates, skip/add-Semantik inkl.
   skippable/optional-Regeln, Re-Entry, DAG-Reihenfolge), **Meta-Runner** (Loop-Terminierung
   inkl. No-Progress, Batch-Resume), **UsageAggregator** (Golden-Events → Kostenbericht,
   Schätz-Fallback-Markierung), **SyncEngine** (Fake-`HttpMessageHandler`, Idempotenz,
   Konflikte), **Cancellation** (shutdown mitten in REST/git/Engine-Step ⇒ sauberer Abbruch,
   keine halben State-Writes — atomic rename testet das).
2. **Bridge-Mock-Harness (ohne CLI):** wie gehabt (deny/allow/Timeout/Crash/Confirm-Deadline)
   + flow (`/feature start` ⇒ plan.md + State; `/workflow next` ohne Gates ⇒ präzise Meldung;
   `/workflow skip doc` ⇒ protokolliert) + recorder (usage-Event-Sequenz ⇒ `/flightlog costs`
   liefert erwartete Summen je Modell).
3. **Lokal (User-Scope, Link-Modus):** Install → `/extensions list` (4×) → Deny-Fälle →
   `/feature start` local → Session-Neustart → Re-Entry → `/mode remote` gegen Test-ADO ⇒
   Sync → `/goal` + `/loop` mit absichtlich rotem Check ⇒ terminiert korrekt →
   `/autopilot on` ⇒ Härtung → `/flightlog costs` zeigt Modelle/Tokens/Denies →
   `dotnet publish` + `/extensions reload` (Shadow-Copy) → Opt-out-Marker im Zweitprojekt.
4. **Copy-Modus/Windows:** `install.ps1 --mode copy`, Junction-Fallback, reload ohne Locks.
5. **CI:** `extensions`-Job grün; Validator grün unter `--strict`.

---

## 11. Risiken & Pins

- **Instabile `extension.mjs`-API (größtes Risiko):** CLI-Version in `versions.json` pinnen;
  Feature-Detection (fehlende Capability ⇒ Hook stumm + stderr-Warnung); stabile Grenze ist
  `mkc-bridge/1`.
- **`assistant.usage`-Verfügbarkeit je CLI-Version:** Fallback Zeichen-Schätzung, sichtbar
  als „geschätzt" markiert; PriceTable mit Stand-Datum (Preise ändern sich — Pflegeaufwand
  bewusst beim User).
- **`@github/copilot-sdk` auto-resolved, kein Lockfile:** Capability-Handshake +
  Payload-Normalisierung im Shim.
- **ADO-/Confluence-REST direkt:** API-Versionen pinnen (`api-version=7.1`, Confluence v2);
  Auth nur via `${env:…}`/Keychain; Remote-Fehler degradieren deterministisch auf local.
- **Fleet-Semantik ungeklärt:** Wirken Extension-Hooks auf Subagent-Tool-Calls? Erst im
  Dogfooding verifizieren — deshalb v2, nicht v1.
- **net10.0-Toolchain:** CI `setup-dotnet` 10.0.x; lokal .NET-10-SDK-Voraussetzung im README;
  das net8-`dotnet-starter`-Template bleibt separat und unberührt.
- **Sync-Konflikte local↔remote:** idempotentes Mapping, definierte Konfliktpfade, getestet.
- **User-Scope wirkt überall:** gewollt; Opt-out-Marker + `/extensions disable` als Ventile.
- **Mehrfach-Hook-Aggregation CLI-seitig nicht garantiert dokumentiert:** Mock-Harness testet
  Einzel-Extension-Semantik; Mehrfach-Verhalten im Dogfooding (ADR-Offene-Frage).
- **Latenz `preToolUse`:** warmer Child, ReadyToRun + Source-Gen, 2000-ms-Budget fail-closed;
  Recorder misst real.
- **Doppel-Guarding** mit `hooks.json`-Guards des Work-Plugins: gewollt redundant;
  Konsolidierungspfad im ADR (analog anonymizer-proxy-Pfad).
- **Scope-Creep:** Phasenplan §9 ist verbindlich — keine Phase beginnt vor grünem CI +
  Dogfooding der vorigen.

---

## 12. Referenzen

- Repo-intern: `docs/adr/0004-git-guardrails.md` ·
  `marketplaces/work/plugins/general/policy/git-guardrails.json` ·
  `marketplaces/work/plugins/general/hooks/scripts/pre-tool-guardian.sh` ·
  `tools/validate-plugins.mjs` (Vorbild Validator) ·
  `marketplaces/work/plugins/orchestration/` (Workflow-Vorbilder, die §5.2 deterministisch macht).
- Extern: [Copilot CLI Extensions Revamp (dev.to/htekdev)](https://dev.to/htekdev/copilot-cli-extensions-revamp-custom-slash-commands-and-full-extensibility-1f9e) ·
  [Complete Guide (htek.dev)](https://htek.dev/articles/github-copilot-cli-extensions-complete-guide) ·
  [github/copilot-sdk](https://github.com/github/copilot-sdk) (NuGet `GitHub.Copilot.SDK`) ·
  [Autopilot (GitHub Docs)](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot) ·
  [Hooks-Referenz (GitHub Docs)](https://docs.github.com/en/copilot/reference/hooks-configuration) ·
  [/fleet (GitHub Docs)](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet) ·
  [Custom Agents & Sub-Agents (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents) ·
  [SDK Streaming Events inkl. assistant.usage (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/streaming-events) ·
  [Modelle & Preise (GitHub Docs)](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing) ·
  [Caveman-Skill](https://github.com/JuliusBrussee/caveman)
