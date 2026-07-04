# Copilot-CLI-Extensions — Finaler Plan (experimentell, Work-Welt, .NET)

> Status: **Geplant / experimentell** · Sprache der Implementierung: **C# / net8.0**
> Dieses Dokument ist der finale Implementierungsplan für die lokalen Copilot-CLI-Extensions
> (das `.github/extensions/`-System der CLI — **keine** MCP-Server, **keine** Copilot-Plugins,
> **keine** GitHub-App-Extensions). Architektur-Entscheidung: ADR-0010 (bei Umsetzung anzulegen).

---

## 0. Kontext

Das Monorepo enthält zwei Copilot-CLI-Marketplaces (Work + Home) mit prompt-basierten
Skills, Hooks und Agents. Die CLI bietet zusätzlich ein **lokales Extension-System**:
Verzeichnisse mit `extension.mjs` werden aus `~/.copilot/extensions/` (User-Scope) bzw.
`.github/extensions/` (Projekt-Scope) geladen, laufen als eigener Kindprozess und sprechen
über JSON-RPC mit dem Agent-Harness. Über `joinSession()` erhält eine Extension die volle
Harness-Oberfläche: Lifecycle-Hooks (`preToolUse`, `postToolUse`, `userPromptSubmitted`,
`sessionStart`, `sessionEnd`, `errorOccurred`), eigene Tools, eigene Slash-Commands,
UI-Elicitation-Dialoge, SystemMessage-Anpassung und den Session-Event-Stream. Verwaltung
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

### 0.2 Fixierte Entscheidungen

| Frage | Entscheidung |
|---|---|
| Ort | Quellcode top-level `extensions/` im Monorepo (außerhalb der Marketplaces); Aktivierung **ausschließlich User-Scope** via Install-Skript nach `~/.copilot/extensions/`. **Kein** `.github/extensions/` in diesem Repo. |
| Schnitt | **4 Extensions**, einzeln via `/extensions enable\|disable` schaltbar, eine gemeinsame .NET-Core-Library: `mkc-work-guardian`, `mkc-work-sentinel`, `mkc-work-flow`, `mkc-work-recorder` |
| Remote-Zugriff | **Kein separater ADO-/Confluence-MCP.** Der Remote-Modus ruft Azure-DevOps- und Confluence-REST-APIs direkt aus .NET auf (deterministisch, PII-gescrubbt, PAT via `${env:…}`/OS-Keychain). Der Local-Modus arbeitet komplett dateibasiert. **Eine Tool-Fassade, zwei Backends** (§7). |
| Workflows | Token-optimierte Arbeitswege (keine CI!) als **Code-State-Machines** mit persistiertem Zustand: an jeder Stelle unterbrech- und wiedereinsteigbar, Moduswechsel local↔remote an jedem Schritt (§7, §8). |
| Autopilot | „Härten + Budgets": autonom ⇒ harte Denies statt Rückfragen, Tool-/Datei-Budgets, automatische Checkpoints, riskante Ops verweigert; interaktiv ⇒ Elicitation-Dialoge (confirm/select) statt Denies |
| Welten | **Work-only** (`mkc-work-*`-Prefix). Home-Variante wäre später eine separate `mkc-home-*`-Extension. Zwei-Welten-Prinzip wird im ADR ergänzt: Extensions sind welt-gebunden per Namenskonvention und teilen nur `Mkc.Copilot.Extensions.Core`. |
| Bridge | Fester Node-Stecker (`extension.mjs`, `joinSession`) ↔ .NET-Prozess über **JSON-Lines/stdio** (`mkc-bridge/1`); gesamte Logik in .NET (§0.1) |
| .NET | net8.0 (wie `dotnet-starter`-Template), xUnit, System.Text.Json Source-Gen, HttpClient für REST — keine externen NuGets in v1 |

**Konsequenz aus „User-Scope only":** Die Extensions wirken in **allen** Projekten des Users
(das ist der gewünschte Nutzen im Work-Alltag). Steuerung pro Projekt/Session erfolgt über
`/extensions disable <name>` bzw. eine Opt-out-Markerdatei (§6.5, Mechanik 9). Dogfooding in
diesem Repo geschieht ebenfalls über die User-Scope-Installation (Link-Modus), nicht über Repo-Shims.

---

## 1. Verzeichnis-Layout (alle neuen Dateien)

```
PersonalAgentPlugin/
├── extensions/                                   # NEU, top-level, Status: experimentell
│   ├── README.md                                 # DE, Experimentell-Banner, Install/Dev-Loop, /extensions-Nutzung
│   ├── versions.json                             # Pins: getestete copilot-CLI-Version, Bridge-Protokoll-Version
│   ├── .gitignore                                # host/*/bin/, dist-Artefakte
│   ├── Mkc.Copilot.Extensions.sln
│   ├── Directory.Build.props                     # net8.0, Nullable, TreatWarningsAsErrors, ReadyToRun, Version
│   ├── src/
│   │   ├── Mkc.Copilot.Extensions.Core/          # geteilte classlib
│   │   │   ├── Bridge/
│   │   │   │   ├── BridgeHost.cs                 # stdin/stdout-Loop, id-Korrelation, Dispatch, Timeouts
│   │   │   │   ├── BridgeMessage.cs              # Envelope {v,id,type,method,payload}
│   │   │   │   ├── BridgeJsonContext.cs          # System.Text.Json Source-Gen (Startup-/Hook-Latenz)
│   │   │   │   ├── HookPayloads.cs               # DTOs aller hook.*/tool.*/command.*/ui.*-Methoden
│   │   │   │   └── RegistrationManifest.cs       # hooks/tools/commands/systemMessage + status:"experimental"
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
│   │   │   │   ├── WorkflowEngine.cs             # deterministische Step-State-Machine, Gates, Re-Entry
│   │   │   │   ├── WorkflowState.cs              # persistierter Zustand: workflows/<id>.json (Step-Pointer, Artefakte, Links)
│   │   │   │   └── Definitions/                  # FeatureFlow.cs, BugfixFlow.cs, DocFlow.cs — Steps als Code (§7.2)
│   │   │   ├── Backends/
│   │   │   │   ├── IPlanningBackend.cs           # Fassade: Ticket-/Plan-/Doku-Operationen, backend-agnostisch (§7.1)
│   │   │   │   ├── LocalBackend.cs               # .copilot/planning/<id>/plan.md + notes.md, Status im Front-Matter
│   │   │   │   ├── AdoBackend.cs                 # ADO REST (WorkItems, PRs); PAT via env/Keychain; PII-Scrub vorab
│   │   │   │   ├── ConfluenceBackend.cs          # Confluence REST (Markdown→Storage-Format)
│   │   │   │   └── SyncEngine.cs                 # local↔remote-Abgleich beim Moduswechsel, links.json-Mapping
│   │   │   ├── State/
│   │   │   │   ├── StateStore.cs                 # <cwd>/.copilot/state/extensions/mkc/…, atomare JSON-Writes
│   │   │   │   ├── Budgets.cs                    # persistente Zähler (Tool-Calls, Writes, Shell, Denials)
│   │   │   │   └── Checkpointer.cs               # `git stash create` + Diff-Patch, Checkpoint-Index
│   │   │   └── Pii/
│   │   │       └── PiiScrubber.cs                # reversible Placeholder-Map; ersetzt den anonymizer-proxy im REST-Pfad
│   │   ├── Mkc.Copilot.Extensions.Guardian/      # Head 1 (Exe): Program.cs (+ --print-manifest), GuardianExtension.cs, DefaultPolicy.cs
│   │   ├── Mkc.Copilot.Extensions.Sentinel/      # Head 2 (Exe): SentinelExtension.cs (Mode/Budgets/Checkpoints)
│   │   ├── Mkc.Copilot.Extensions.Flow/          # Head 3 (Exe): FlowExtension.cs, WorkConventions.cs, CommitComposer.cs
│   │   └── Mkc.Copilot.Extensions.Recorder/      # Head 4 (Exe): RecorderExtension.cs, SessionReport.cs
│   ├── tests/Mkc.Copilot.Extensions.Tests/       # xUnit: GitGuardrailsTests (inkl. sh -c/&&-Umgehung), SecretScannerTests,
│   │                                             #   PiiScrubberTests (Roundtrip), ModeDetectorTests, BudgetsTests,
│   │                                             #   CheckpointerTests (temp-git-Repo), BridgeProtocolTests (Golden Files),
│   │                                             #   WorkflowEngineTests (Re-Entry), SyncEngineTests (Fake-HTTP-Handler)
│   ├── host/                                     # Auslieferungs-Einheiten (genau das, was installiert wird)
│   │   ├── lib/bridge.mjs                        # EINZIGE Shim-Logik: spawn, NDJSON-Framing, Handshake,
│   │   │                                         #   Shadow-Copy-Spawn, Restart/Fail-Policy; joinSession injizierbar
│   │   ├── mkc-work-guardian/
│   │   │   ├── extension.mjs                     # ~12 Zeilen: import ./bridge.mjs → startBridge(joinSession, {name, failMode:"closed"})
│   │   │   ├── bridge.mjs                        # Einzeiler-Re-Export: export * from "../lib/bridge.mjs"
│   │   │   └── (bin/ — publish-Output, gitignored)
│   │   ├── mkc-work-sentinel/   (extension.mjs, bridge.mjs, bin/)
│   │   ├── mkc-work-flow/       (extension.mjs, bridge.mjs, bin/)
│   │   └── mkc-work-recorder/   (extension.mjs, bridge.mjs, bin/)
│   ├── shim-test/
│   │   ├── mock-harness.test.mjs                 # Fake-joinSession + ECHTE .NET-Binaries: Skript-Dialoge
│   │   └── fixtures/                             # Golden-NDJSON (init→manifest→preToolUse→deny …)
│   └── install/
│       ├── install.sh / install.ps1              # publish + link|copy nach ~/.copilot/extensions/
│       └── uninstall.sh / uninstall.ps1
├── tools/validate-extensions.mjs                 # NEU (§9)
├── tools/test/validate-extensions.test.mjs       # NEU
├── docs/adr/0010-copilot-cli-extensions.md       # NEU (Format wie ADR-0004/0007)
├── docs/extensions-bridge-protocol.md            # NEU: kanonische Protokoll-Spec
└── Änderungen: ARCHITECTURE.md (§1-Baum + neues §10) · README.md · package.json · .github/workflows/ci.yml
```

`dotnet publish` schreibt je Head nach `extensions/host/<name>/bin/` — dadurch ist
`host/<name>/` in **beiden** Install-Modi die vollständige, selbsttragende Einheit, und
`extension.mjs` löst das Binary immer einheitlich als `./bin/<Head>.dll` auf (Override: `MKC_EXT_BIN`).

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
  Inhalt von `host/lib/bridge.mjs` (materialisieren statt Import-Rewrite — kein Patchen von
  `extension.mjs` nötig). Ergebnis ist selbsttragend, ohne Repo-Abhängigkeit.
- **Windows:** Symlinks erfordern Developer-Mode/Admin ⇒ `install.ps1` nutzt im Link-Modus
  **Directory Junctions** (`New-Item -ItemType Junction`, kein Admin nötig).
- **Hot-Reload × Links × Windows-File-Locks:** Der laufende .NET-Child sperrt seine DLLs;
  `dotnet publish` in `bin/` würde auf Windows scheitern. Lösung im Shim: **Shadow-Copy-Spawn**
  — `bridge.mjs` kopiert `bin/` vor dem Spawn in ein Session-Temp-Verzeichnis und startet von
  dort (`MKC_NO_SHADOW=1` schaltet ab). `/extensions reload` → Shim-Dispose → `shutdown` an
  Child → Respawn mit frischer Shadow-Copy des neuen `bin/`. Deterministischer Dev-Loop auf allen Plattformen.
- **Default-Auswahl:** guardian + sentinel + flow; recorder nur mit `--with-recorder`
  (Telemetrie ist Opt-in). `uninstall` entfernt Links/Kopien und lässt projektlokalen State
  (`.copilot/state/extensions/mkc/` und `.copilot/planning/`) unangetastet.

---

## 3. Bridge: Mechanismus + JSON-Lines-Protokoll `mkc-bridge/1`

**Entscheidung:** Fester Stecker mit `joinSession` als einziger Kontakt zur dokumentierten
Extension-Oberfläche; der .NET-Prozess ist ein reines stdin/stdout-Programm und trägt die
gesamte Logik (§0.1). Begründung: Testbarkeit ohne CLI (Mock-Harness), Hot-Reload trivial,
keine Abhängigkeit von undokumentiertem `ForUri`-Token-Plumbing, minimale Angriffsfläche
(keine NuGet-Fremdpakete). NuGet `GitHub.Copilot.SDK` wird in v1 **nicht** referenziert;
Migrationspfad (Stecker entfällt, Heads auf natives SDK) im ADR als Offene Frage.

Transport: **NDJSON** (1 Objekt/Zeile, UTF-8) auf stdin/stdout; **stderr = Logs**. Envelope:

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
   `{status:"experimental", hooks[], tools[{name,description,inputSchema,skipPermission?,deferred?}],
   commands[{name,description}], systemMessage{mode:"append",sections[]}, wantsPermissionFlow,
   wantsSessionEvents[]}`; Shim registriert exakt das bei `joinSession` und forwarded alle Handler.

**Shim → Child (`req`, mit Timeout + Fail-Policy):**

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
| `shutdown` | `{}` | `{}`; Child flusht, exit 0; Kill nach 3 s | 3000 ms |

**Shim → Child (`event`, fire-and-forget):** `event.session {kind:"UserMessage"|"AssistantMessageDelta"|
"ToolExecutionStart"|"ToolExecutionComplete"|"SessionIdle"|"Compaction"|…, data}` — nur die per
`wantsSessionEvents` abonnierten.

**Child → Shim (`req`, verschachtelt erlaubt):**
`ui.confirm {title,message,timeoutMs?}` → `{confirmed, timedOut?}` ·
`ui.select {message,options[]}` → `{choice}` · `ui.input {message}` → `{value}` ·
`ui.elicit {schema}` → `{value}` (Mapping auf `session.Ui.*`; nicht beantwortete Dialoge meldet
der Shim nach `timeoutMs` als `timedOut:true` zurück — Grundlage der Confirm-Deadline-Mechanik).

**Fail-Policy im Shim (pro Extension konfiguriert):** kaputte Zeile ⇒ stderr + ignorieren.
Child-Crash ⇒ 1 Restart mit Backoff, danach: `failMode:"closed"` (guardian, sentinel) = Shim
beantwortet `preToolUse`/`permission.request` selbst mit `deny` („mkc-work-guardian offline —
fail-closed"); `failMode:"open"` (flow, recorder) = Hooks werden No-Ops. Timeout einer
Guardian-/Sentinel-`preToolUse` ⇒ `deny`. **Normalisierung:** `toolName`/`tool_name`-Varianten
(im Repo bereits in `pre-tool-guardian.sh` beobachtet) normalisiert der Shim; das
Bridge-Protokoll ist die stabile Grenze.

---

## 4. Der 4er-Schnitt: Hooks/Tools/Commands + Autopilot-Verhalten

**Architektur-Prinzip (löst die Kopplung Guardian↔Sentinel):** Alle vier Extensions
registrieren ihre eigenen Hooks; die CLI führt die `preToolUse`-Hooks **aller** aktiven
Extensions aus, und **jedes Deny gewinnt** — Enforcement braucht daher **keine** IPC im heißen
Pfad. IPC gibt es nur zum **Aufweichen** (Deny→Confirm im interaktiven Modus) über den
**Mode-Contract**: `MKC_STATE_DIR/mode.json`
`{mode:"interactive"|"suspected"|"autonomous", updatedAt, sessionId}`, vom Sentinel per
atomic-rename geschrieben und mit Heartbeat aktualisiert. Leser behandeln fehlende Datei als
`unknown` und **veraltete Datei (TTL 5 min) als `autonomous`** — Stale-Daten failen immer in
Richtung „strenger". Ist der Sentinel deaktiviert, greift zusätzlich die **Confirm-Deadline**
(Mechanik 4), die Autopilot auch ohne Mode-Info sicher abfängt.

### 4.1 `mkc-work-guardian` — deterministische Policy als Code (fail-closed)

- **Hooks:** `preToolUse` (Git-Guardrails argv-basiert nach ADR-0004-Tabelle inkl.
  `--force-with-lease`-Ausnahme; Tool-Guardian-Denylist; Secret-Scan auf Args;
  Branch-Name-Lint), `postToolUse` (Secret-/PII-Scan auf Tool-Output → Warn-`additionalContext`),
  `sessionStart`/`sessionEnd` (State/Deny-Gedächtnis laden/flushen).
- **Commands:** `/guardian` (`status` · `why` = letzte Deny-Begründung + Regelquelle ·
  `policy` = effektive Policy inkl. Overrides).
- **Tools:** keine. Policy: `DefaultPolicy.cs` eingebettet (Code = Wahrheit), Override optional
  via `~/.copilot/extensions/mkc-work-guardian/policy.json`.
- **Autopilot:** liest `mode.json`. `autonomous` ⇒ jede Confirm-Stufe wird **deny**
  („[GATE] nur interaktiv"); `interactive` ⇒ Grenzfälle (`git reset --hard` auf eigenem Branch,
  non-konformer Branch-Name) lösen `ui.confirm` aus; Hard-Deny-Liste (force-push auf
  main/master/develop/release/ u. a.) bleibt in **jedem** Modus deny.

### 4.2 `mkc-work-sentinel` — Mode-Detection, Budgets, Checkpoints (fail-closed)

- **Hooks:** `preToolUse` (Budget-Enforcement: bei Erschöpfung deny + `additionalContext`
  „zusammenfassen und stoppen"; im Autopilot vor der ersten mutierenden Op eines Turns
  Checkpoint erzwingen), `errorOccurred` (max 2 Retries mit Backoff-Zähler im State, im
  Autopilot danach `abort`), `sessionStart`/`sessionEnd`; `permission.request`
  (Detektions-Signal + menschliche Antwortlatenz); Session-Events `UserMessage`,
  `ToolExecutionStart/Complete`, `SessionIdle`.
- **Commands:** `/autopilot` (`on|off|auto|status` — `on/off` autoritativ, `auto` = Heuristik),
  `/budget` (`show|set <key> <n>`), `/checkpoint` (`list|create`).
- **Tools:** keine (Checkpoints führt der .NET-Prozess selbst aus: `git stash create` liefert
  eine Commit-Id ohne Working-Tree-Berührung + `git diff`-Patch ins State-Dir; Index in
  `checkpoints.json`).
- **Detektion (ModeDetector, Hysterese):** Signal A `/autopilot on|off` (autoritativ) ·
  Signal B ≥3 aufeinanderfolgende `ToolExecutionStart` ohne dazwischenliegenden
  `permission.request` ⇒ SUSPECTED, weitere 3 ⇒ AUTONOMOUS · Signal C `UserMessage` bzw.
  Permission-Antwort mit Latenz >1,5 s ⇒ Abstieg um genau eine Stufe. Schreibt `mode.json` mit Heartbeat.
- **Autopilot:** Kern der Extension — härtet (Budgets aktiv, Checkpoint-Pflicht, Retry→Abort);
  interaktiv nur Beobachtung + `/budget`-Warnschwellen als Hinweis statt Deny.

### 4.3 `mkc-work-flow` — Workflows, Work-Konventionen & Backend-Modi (fail-open)

Der Arbeits-Kern (Detail in §7 und §8):

- **Hooks:** `userPromptSubmitted` (PII-Scrub: Email/ADO-UPN/FullName/PhoneDE → reversible
  Platzhalter pro Session; IBAN/SteuerID → Redaktion), `sessionStart` (Re-Entry: aktive
  Workflows + Backend-Modus + Branch→Ticket-Ableitung als **ein kompakter Kontextblock**),
  `postToolUse` (Workflow-Gates: registriert deterministisch, ob Step-Kriterien erfüllt sind,
  z. B. „Tests grün", „Commit vorhanden").
- **SystemMessage:** Append-Section `mkc-work-conventions` (Conventional Commits,
  git-flow-Branch-Schema, ADO-Gepflogenheiten, [CONFIRM]/[GATE]-Semantik) — deterministisch
  aus Repo-Zustand generiert, nicht statisch.
- **Commands:** `/mode` (`status|local|remote`), `/workflow` (`list|resume [id]|next|skip|abort`),
  `/feature start "…"`, `/bugfix start "…"`, `/doc start "…"`, `/moin`, `/commitmsg`.
- **Tools (Fassade, in beiden Modi identisch — §7.1):** `planning_read`, `planning_write`,
  `doc_draft`, `doc_publish`, `compose_commit_message`, `deanonymize_text` (SkipPermission,
  rein lokal via Placeholder-Map).
- **Autopilot:** `interactive` ⇒ bei IBAN/SteuerID `ui.select`
  („umformulieren / redigiert senden / abbrechen"), Moduswechsel-Sync-Dialoge, Step-Bestätigungen;
  `autonomous` ⇒ stille harte PII-Redaktion, **kein** `doc_publish`/Work-Item-Write nach remote
  (nur lokale Drafts), kein Step-Skip, `/moin` verweigert sich (interaktives Kommando).

### 4.4 `mkc-work-recorder` — Flight-Recorder (fail-open, Opt-in)

- **Hooks/Events:** alle Session-Events → JSONL `MKC_STATE_DIR/recorder/<session>.jsonl`;
  `postToolUse` (Latenzen); `sessionEnd` → Markdown-Report nach
  `.copilot/state/artifacts/flight-<ts>.md` (Repo-Render-Pattern: garantierter Fallback).
- **Commands:** `/flightlog` (`last` inline-Kurzreport; `report` = Artefakt mit
  Tool-Latenz-Histogramm, Deny-Zählern, Compaction-Events, Turn-Statistik,
  Checkpoint-Korrelation via read-only Blick auf `checkpoints.json` des Sentinels).
- **Autopilot:** `autonomous` ⇒ Voll-Capture inkl. Argument-Digests + Checkpoint-Index;
  `interactive` ⇒ gesampelte, schlankere Aufzeichnung.

---

## 5. Local/Remote-Modus & Workflow-Engine

### 5.1 Eine Tool-Fassade, zwei Backends

`IPlanningBackend` definiert die fachlichen Operationen backend-agnostisch:

| Operation | Local-Backend | Remote-Backend |
|---|---|---|
| `GetTicket(id)` / `CreateTicket(…)` / `UpdateStatus(…)` | `.copilot/planning/<id>/plan.md` (YAML-Front-Matter: Status, Steps, Links) | ADO REST WorkItems (PAT via `${env:ADO_PAT}`/Keychain) |
| `ReadPlan(id)` / `WritePlan(id, …)` | `plan.md`-Body | WorkItem-Description/Comments |
| `DraftDoc(id, …)` / `PublishDoc(id, …)` | `.copilot/planning/<id>/notes.md` → optional `docs/` | Confluence REST (Markdown→Storage-Format) |
| `CreatePr(…)` / `GetPrStatus(…)` | lokale Checkliste in `plan.md` | ADO REST Pull Requests |

Entscheidend für die Token-Optimierung: **Das LLM sieht in beiden Modi exakt dieselben Tools**
(`planning_read`, `planning_write`, `doc_draft`, `doc_publish`). Der Moduswechsel ist für das
Modell unsichtbar — kein Kontext wird invalidiert, keine neuen Tool-Schemata, keine
MCP-Server-Beschreibungen im Prompt. **Deshalb braucht es keinen ADO-/Confluence-MCP mehr:**
die REST-Aufrufe passieren deterministisch in C# (`HttpClient`), PII wird vom `PiiScrubber`
**vor** jedem Remote-Call ersetzt (übernimmt die anonymizer-proxy-Rolle für diesen Pfad),
Antworten werden zu **kompakten Digests** reduziert, bevor sie ans Modell gehen.

**Moduswechsel — an jeder Stelle, in beide Richtungen** (`/mode local|remote`):
- Modus persistiert pro Projekt: `MKC_STATE_DIR/backend.json` `{backend:"local"|"remote"}`.
- `SyncEngine` gleicht beim Wechsel ab; das Mapping lebt in
  `.copilot/planning/<id>/links.json` `{ado:"AB#1234", confluencePageId:"…", lastSync:"…"}`.
  - **local→remote:** `plan.md` ohne ADO-Link ⇒ Elicitation „WorkItem anlegen / verknüpfen /
    lokal lassen"; `notes.md` ⇒ Confluence-Draft. Idempotent (Re-Sync erkennt bestehende Links).
  - **remote→local:** WorkItem + verknüpfte Seite werden als Snapshot in die lokalen Dateien
    gezogen (deanonymisiert via Placeholder-Map, rein lokal).
  - Konflikt (beide Seiten geändert): interaktiv ⇒ `ui.select` (local gewinnt / remote gewinnt /
    beides behalten als `plan.remote.md`); autonom ⇒ fail-safe: lokale Kopie behalten, Warnung.
- Kein Remote-Token konfiguriert ⇒ `/mode remote` erklärt deterministisch, was fehlt, und
  bleibt auf local.

### 5.2 Workflow-Engine: token-optimierte Arbeitswege (keine CI)

Ein Workflow ist eine **Code-State-Machine** (`Definitions/*.cs`): benannte Steps mit
deterministischen **Eintritts-Gates**, **Aktionen** und **Exit-Kriterien**. Zustand pro
Workflow-Instanz in `MKC_STATE_DIR/workflows/<id>.json`: Step-Pointer, erledigte Gates,
erzeugte Artefakte, Backend-Links, Zeitstempel. Dadurch:

- **Überall wiedereinsteigbar:** Neue Session (auch Tage später) ⇒ `sessionStart` findet
  aktive Workflows und injiziert **einen** kompakten Kontextblock
  („Aktiv: feature/AB#1234 ‚CSV-Export', Schritt 3/6 *Implementieren*, Gates offen: Tests.
  Weiter mit /workflow next"). Kein erneutes Erklären, kein erneutes Einlesen — der Zustand
  ist die Wahrheit, nicht der Chatverlauf.
- **Token-Optimierung ist Systemprinzip:**
  1. Datensammlung (git status/diff-Zusammenfassung, WorkItem-Felder, Testresultate) macht C#
     — das Modell bekommt Digests, nie Rohdumps.
  2. Standard-Artefakte (Branch-Name nach git-flow, Commit-Message-Gerüst, PR-Beschreibung,
     plan.md-/Confluence-Skeleton) erzeugt Code; das LLM füllt nur markierte Lücken.
  3. Gates prüft Code (`dotnet test`-Exitcode, Commit vorhanden, Branch-Schema) — das Modell
     wird nicht gefragt, ob etwas „fertig aussieht".
  4. Pro Step wird nur der für den Step relevante Kontext injiziert (Step-scoped
     `additionalContext`), nicht der ganze Workflow.
- **Workflow-Definitionen v1:**
  - `feature`: Ticket (local/remote) → Plan → Branch → Implementieren → Testen → Commit/PR → Doku
  - `bugfix`: Repro → Ticket-Link → Fix → Regressionstest → Commit/PR
  - `doc`: Draft (`notes.md`) → Review → Publish (Confluence oder `docs/`)
- Jeder Step kann den Backend-Modus wechseln (§5.1) — der Step-Pointer bleibt stehen, nur die
  Backend-Aufrufe zielen woanders hin.

---

## 6. Funktionalität & Benutzung (Walkthrough)

So fühlt sich das im Alltag an (alles Genannte ist deterministischer Code, kein Prompt):

**Session-Start.** `copilot` in einem Work-Projekt starten. `mkc-work-flow` meldet in einem
Kontextblock: Backend-Modus, aktive Workflows mit Step, Branch→Ticket. `mkc-work-guardian`
und `mkc-work-sentinel` sind still, bis etwas passiert.

**Morgens:** `/moin` → Workday-Report aus Code: git-Status aller offenen Branches, aktive
Workflows mit nächstem Schritt, offene Checkpoints. (Verweigert sich im Autopilot.)

**Feature beginnen:** `/feature start "CSV-Export für Berichte"` →
1. Auswahl-Dialog (nur interaktiv): Ticket lokal anlegen oder ADO-WorkItem (remote)?
2. Code erzeugt `plan.md`-Skeleton + Branch-Vorschlag `feature/AB#1234-csv-export`
   (BranchNameLint-konform), legt Workflow-Zustand an.
3. Das LLM wird genau einmal gerufen: Plan-Lücken füllen (Akzeptanzkriterien-Entwurf) —
   auf Basis eines kompakten Digests, nicht des ganzen Repos.

**Arbeiten:** Ganz normal mit dem Agenten arbeiten. Im Hintergrund: Guardian blockt
deterministisch (`git push --force` ⇒ deny mit Begründung; `--force-with-lease` ⇒ ok),
Sentinel zählt Budgets, Flow registriert Gate-Fortschritt (`postToolUse`: Tests gelaufen?
Commit da?). `/workflow next` schaltet erst weiter, wenn die Gates des Steps erfüllt sind —
sonst sagt es präzise, was fehlt. `/commitmsg` baut die Conventional-Commit-Message mit
AB#-Referenz aus dem staged Diff.

**Moduswechsel mittendrin:** `/mode local` im Zug ohne VPN → SyncEngine snapshottet das
WorkItem in `plan.md`, ab jetzt läuft Planung/Doku dateibasiert weiter. Zurück im Büro:
`/mode remote` → Abgleich-Dialog, lokale Änderungen gehen als Update ins WorkItem, der
Doku-Draft als Confluence-Entwurf. Der Workflow-Step bleibt dabei unverändert stehen.

**Unterbrechen & Wiedereinsteigen:** CLI schließen, drei Tage später irgendwo weitermachen:
`/workflow list` zeigt alle offenen Instanzen, `/workflow resume ab1234` setzt exakt am
Step-Pointer wieder auf — mit einem einzigen injizierten Kontextblock statt Rekonstruktion
aus dem Chatverlauf.

**Autopilot:** `/autopilot on` (oder Heuristik erkennt autonomes Arbeiten) → Guardian
eskaliert Confirm-Fälle zu Denies, Sentinel erzwingt Checkpoints vor mutierenden Ops und
stoppt bei Budget-Erschöpfung, Flow publiziert nichts mehr nach ADO/Confluence (nur lokale
Drafts), Dialoge entfallen. Zurück interaktiv (`/autopilot off` oder erste User-Nachricht) →
Dialoge statt Denies, liegengebliebene Publish-Schritte werden angeboten.

**Diagnose:** `/guardian why` (letzter Deny + Regelquelle) · `/budget show` ·
`/checkpoint list` · `/flightlog report` (Latenz-Histogramm, Deny-Zähler, Turn-Statistik) ·
`/extensions info mkc-work-flow` (registrierte Tools/Commands).

### 6.5 Clevere Mechaniken (deterministisch statt Prompt-Hoffnung)

1. **Echter Shell/git-argv-Parser** (Ketten `&&`/`;`/`|`, `sh -c "…"`, `git -C`, Quoting,
   `-f` vs. `--force-with-lease`) — schließt die Offene Frage aus ADR-0004.
2. **Persistente Budgets** über atomare JSON-Writes, sichtbar via `/budget show`.
3. **Checkpoints ohne Working-Tree-Berührung** (`git stash create` + Diff-Patch) mit Index und `/checkpoint list`.
4. **Confirm-Deadline:** jedes `ui.confirm` trägt `timeoutMs` (60 s); keine Antwort ⇒ `timedOut`
   ⇒ **deny**. Macht die Guards autopilot-sicher, selbst wenn der Sentinel deaktiviert/gestorben ist.
5. **Mode-Contract mit Stale-fails-strict-Semantik** (TTL ⇒ `autonomous`).
6. **Entropie-basierter Secret-Scan** auf Args **und** Tool-Output.
7. **Reversible PII-Platzhalter-Map** + lokales `deanonymize_text`; PII-Scrub vor jedem REST-Call.
8. **Wiederholungs-Gedächtnis:** 3× identisch verweigerter Versuch ⇒ eskalierender
   `additionalContext` („STOP: X ist policy-blockiert, mach Y"); im Autopilot ⇒ `abort`.
9. **Projekt-Opt-out-Marker:** Datei `.copilot/mkc-extensions.json`
   `{"disable":["mkc-work-flow"]}` im Projekt ⇒ betroffene Heads schalten sich bei
   `sessionStart` selbst passiv (nötig, weil User-Scope überall wirkt).
10. **Deterministische SystemMessage aus Repo-Zustand** (Branch→Ticket, Projekttyp) statt statischer Prompts.
11. **Backend-unsichtbare Tool-Fassade** (§5.1): Moduswechsel ohne Kontext-Invalidierung.
12. **Workflow-Zustand als Wahrheit** (§5.2): Re-Entry über State-Datei statt Chatverlauf —
    der größte einzelne Token-Hebel.

---

## 7. Validierung & CI

**`tools/validate-extensions.mjs`** (getrennt vom Plugin-Validator; Findings-Tiers
error/warning/hint aus `tools/lib/` wiederverwendet): scannt `extensions/host/*` —
`extension.mjs` vorhanden + `node --check`; `bridge.mjs`-Einzeiler konsistent mit
`host/lib/bridge.mjs`; Manifest-Kontrakt via `dotnet run --project … -- --print-manifest`
(offline, ohne CLI): Schema-Check (hooks ∈ bekannter Menge, gültige Tool-inputSchemas,
`status:"experimental"` gesetzt), ohne .NET SDK ⇒ warning statt error;
Protokoll-Versions-Konsistenz `versions.json` ↔ `bridge.mjs` ↔ `BridgeMessage.cs`.

**`package.json`:** `"validate:extensions"`,
`"test:extensions": "dotnet test extensions && node --test extensions/shim-test/"`
(dotnet-guarded), beide in `npm test` eingehängt.

**`.github/workflows/ci.yml`** — neuer Job `extensions`: `actions/setup-dotnet@v4` (8.0.x) →
`dotnet build extensions -warnaserror` → `dotnet test extensions` → `dotnet publish` aller
Heads nach `host/*/bin` → `node tools/validate-extensions.mjs` →
`node --test extensions/shim-test/mock-harness.test.mjs` (spawnt echte Binaries).
**Nicht** `continue-on-error` (lauffähiger Code, kein Scaffold).
Nebenbefund: der bestehende CI-Step `mcp-servers/dotnet-mcpserver-starter` referenziert ein
nicht existierendes Verzeichnis — bei Umsetzung mit korrigieren.

---

## 8. Docs (deutsch)

1. **`docs/adr/0010-copilot-cli-extensions.md`** (Format wie ADR-0004/0007:
   Status/Kontext/Optionen/Entscheidung/Konsequenzen/Offene Fragen). Entscheidungen: Ort
   top-level + **User-Scope-only**; Bridge = fester Stecker + .NET-Logik (vs. ForUri vs.
   reines Node); **4er-Schnitt** mit Hook-Unabhängigkeits-Prinzip („jedes Deny gewinnt",
   Mode-Contract nur zum Aufweichen, stale-fails-strict); Autopilot-Policy „Härten + Budgets";
   **native REST-Backends statt ADO-/Confluence-MCP** (eine Tool-Fassade, zwei Backends);
   Welt-Bindung `mkc-work-*`. Konsequenzen: Doppel-Wirkung mit `hooks.json`-Guards des
   Work-Plugins (redundant, Extension = strengeres Superset; Konsolidierung = Offene Frage),
   fail-closed kann nerven (bewusst). Offene Fragen: ForUri-Spike, `@github/copilot-sdk`-Drift,
   Vereinheitlichung `policy/git-guardrails.json` ↔ `DefaultPolicy.cs`, Home-Variante,
   Ablösung des `@azure-devops/mcp`+anonymizer-proxy-Pfads im Work-Marketplace.
2. **`docs/extensions-bridge-protocol.md`** — kanonische Spec aus §3.
3. **`ARCHITECTURE.md`:** Struktur-Baum + neues **§10 Extensions (experimentell, Work,
   User-Scope)** mit Schnitt-Tabelle, Mode-Contract, Backend-Fassade, Fail-Policies,
   Install-Modi. **`README.md`:** Struktur + Install-Zeile. **`extensions/README.md`:**
   Experimentell-Banner + getestete CLI-Version (`versions.json`).

---

## 9. Implementierungs-Reihenfolge

1. Gerüst (`sln`, `Directory.Build.props`, Core, Tests) + ADR-0010 + Protokoll-Doc
   (Spec zuerst — sie ist der Vertrag).
2. Policy-/Kern-Module rein & voll getestet: ShellCommandParser, GitGuardrails, ToolGuardian,
   SecretScanner, PiiScrubber, Budgets, ModeDetector, Checkpointer.
3. Bridge (BridgeHost/DTOs/Source-Gen) + `host/lib/bridge.mjs` (inkl. Shadow-Copy-Spawn) +
   Golden-File-/Mock-Harness-Tests.
4. Heads `mkc-work-guardian` + `mkc-work-sentinel` (Sicherheitskern) → Install im Link-Modus → Dogfooding.
5. Workflow-Engine + Backends: `IPlanningBackend`, `LocalBackend`, `WorkflowEngine` +
   `feature`-Definition (erst **komplett local**), dann `AdoBackend`/`ConfluenceBackend` +
   `SyncEngine` (remote + Moduswechsel), Head `mkc-work-flow`.
6. Head `mkc-work-recorder`.
7. Installer (sh/ps1, link|copy, Junction-Fallback) + Uninstaller.
8. Validator + CI + package.json + ARCHITECTURE/README-Updates.

---

## 10. Verifikationsplan

1. **Unit:** `dotnet test extensions` — Parser-Umgehungen (`sh -c "git push -f"`,
   `a && git reset --hard`), Entropie-Scan, PII-Roundtrip, Mode-Sequenzen
   (Signal-A/B/C-Kombinationen), Budget-Persistenz, Checkpointer gegen temporäres git-Repo,
   **WorkflowEngine** (Gate-Verweigerung, Re-Entry aus State-Datei, Step-Pointer-Stabilität
   beim Moduswechsel), **SyncEngine** gegen Fake-`HttpMessageHandler` (ADO/Confluence-Fixtures,
   Idempotenz, Konfliktpfade).
2. **Bridge-Mock-Harness (ohne CLI):** Fake-`joinSession` + echtes Guardian-Binary:
   init→Manifest-Assert → `preToolUse{git push --force origin main}` ⇒ deny →
   `--force-with-lease` ⇒ allow → Timeout-Simulation ⇒ fail-closed-Deny durch den Shim →
   Crash ⇒ Restart, dann fail-closed → Confirm-Deadline: `ui.confirm` unbeantwortet ⇒ deny.
   Analog Sentinel (Budget-Erschöpfung ⇒ deny; Event-Sequenz ohne `permission.request` ⇒
   `mode.json` kippt auf `autonomous`) und Flow (`command.invoke /feature start` ⇒ plan.md +
   Workflow-State entstehen; `/workflow next` ohne erfüllte Gates ⇒ präzise Fehlermeldung).
3. **Lokal (User-Scope, Link-Modus):** `extensions/install/install.sh --mode link` →
   `copilot` starten → `/extensions list` zeigt 4 `mkc-work-*` → destruktive Git-Op ⇒ Deny
   mit Begründung → `/guardian why` → `/feature start` (local) → Session beenden, neue Session
   → Re-Entry-Kontextblock + `/workflow resume` → `/mode remote` gegen Test-ADO-Projekt ⇒
   Sync-Dialog, WorkItem entsteht → `/autopilot on` ⇒ Confirm-Fälle werden Denies,
   `doc_publish` verweigert → PII tippen ⇒ Platzhalter → `/flightlog report` → Code ändern,
   `dotnet publish`, `/extensions reload` ⇒ Shadow-Copy lädt neuen Stand → Opt-out-Marker in
   einem Zweitprojekt testen.
4. **Copy-Modus/Windows-Pfad:** `install.ps1 --mode copy` (Junction-Fallback prüfen),
   reload während laufender Session (Lock-Freiheit dank Shadow-Copy).
5. **CI:** `extensions`-Job grün; `validate-extensions` grün unter `--strict`.

---

## 11. Risiken & Pins

- **Instabile `extension.mjs`-API (größtes Risiko):** getestete CLI-Version in `versions.json`
  pinnen; Feature-Detection der `joinSession`-Optionen (fehlende Capability ⇒ Hook stumm +
  stderr-Warnung, kein Crash); stabile Grenze ist `mkc-bridge/1`, nicht die CLI-Payload.
- **`@github/copilot-sdk` auto-resolved, kein Lockfile:** Capability-Handshake +
  Payload-Normalisierung im Shim.
- **ADO-/Confluence-REST direkt:** API-Versionen pinnen (`api-version=7.1`,
  Confluence REST v2); Auth nur PAT/Token aus `${env:…}`/Keychain (Repo-Konvention §2.5),
  nie im State; alle Remote-Fehler degradieren deterministisch auf local (nie blockierender
  Workflow). Rate-Limits: Digest-Prinzip hält Call-Zahl klein.
- **Sync-Konflikte local↔remote:** idempotentes Mapping (`links.json`), Konfliktpfad definiert
  (interaktiv wählen, autonom fail-safe lokal) — getestet in SyncEngineTests.
- **User-Scope wirkt überall:** absichtlich; Projekt-Opt-out-Marker (Mechanik 9) +
  `/extensions disable` als Ventile — im README prominent dokumentieren.
- **4er-Schnitt-Kopplung:** durch „jedes Deny gewinnt" + Confirm-Deadline + stale-fails-strict
  entschärft; Restrisiko: Reihenfolge/Aggregation mehrerer Extension-Hooks ist CLI-seitig
  nicht garantiert dokumentiert ⇒ im Mock-Harness nur Einzel-Extension-Semantik testen,
  Mehrfach-Hook-Verhalten im Dogfooding verifizieren (ADR-Offene-Frage).
- **Latenz `preToolUse`:** warmer Child, ReadyToRun + JSON-Source-Gen, 2000-ms-Budget
  fail-closed; Recorder misst real.
- **Windows:** Junction statt Symlink, Shadow-Copy gegen DLL-Locks, `install.ps1` mit pwsh
  (passend zur bestehenden hooks.json-pwsh-Konvention).
- **Doppel-Guarding** mit `hooks.json`-tool-guardian des Work-Plugins: gewollt redundant in
  der Experimentierphase; Konsolidierungspfad im ADR (gilt analog für den bisherigen
  `@azure-devops/mcp`+anonymizer-proxy-Pfad, den die Backend-Fassade mittelfristig ablösen kann).
- **NuGet `GitHub.Copilot.SDK` ungenutzt in v1:** bewusst; ForUri-Spike als Offene Frage,
  Migration ändert nur Shim + `Program.cs`, nicht Core.

---

## 12. Referenzen

- Bestehende Regelquellen im Repo: `docs/adr/0004-git-guardrails.md`,
  `marketplaces/work/plugins/general/policy/git-guardrails.json`,
  `marketplaces/work/plugins/general/hooks/scripts/pre-tool-guardian.sh` (Referenz-Semantik,
  die `GitGuardrails.cs`/`ToolGuardian.cs` deterministisch superset-ten),
  `tools/validate-plugins.mjs` (Vorbild für den Extension-Validator).
- Extern: [Copilot CLI Extensions Revamp (dev.to/htekdev)](https://dev.to/htekdev/copilot-cli-extensions-revamp-custom-slash-commands-and-full-extensibility-1f9e) ·
  [Complete Guide (htek.dev)](https://htek.dev/articles/github-copilot-cli-extensions-complete-guide) ·
  [github/copilot-sdk](https://github.com/github/copilot-sdk) (NuGet `GitHub.Copilot.SDK`) ·
  [Autopilot-Konzept (GitHub Docs)](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot) ·
  [Hooks-Referenz (GitHub Docs)](https://docs.github.com/en/copilot/reference/hooks-configuration)
