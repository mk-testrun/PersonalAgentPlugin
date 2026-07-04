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
sind Code. Git-Guardrails, Secret-Scan, PII-Schutz und Budgets werden deterministisch,
zustandsbehaftet (persistente Zähler, Cross-Turn-Memory) und testbar (xUnit). Genau das ist
der Vorteil des skriptbaren Ansatzes, den dieser Plan ausnutzt.

**Multi-Language-SDK:** Das Copilot-SDK existiert offiziell für Node, Python, Go, .NET
(NuGet `GitHub.Copilot.SDK`), Java und Rust — die Hook-/Tool-/Command-/Elicitation-Oberfläche
ist identisch. Der dokumentierte Weg für Nicht-JS-Extensions ist ein dünner `extension.mjs`-Shim
(Node übernimmt die SDK-Verdrahtung), der die Fachlogik an einen Kindprozess in der
Zielsprache delegiert. Genau dieses Muster verwenden wir für .NET (siehe §3).

## 0.1 Fixierte Entscheidungen

| Frage | Entscheidung |
|---|---|
| Ort | Quellcode top-level `extensions/` im Monorepo (außerhalb der Marketplaces); Aktivierung **ausschließlich User-Scope** via Install-Skript nach `~/.copilot/extensions/`. **Kein** `.github/extensions/` in diesem Repo. |
| Schnitt | **4 Extensions**, einzeln via `/extensions enable\|disable` schaltbar, eine gemeinsame .NET-Core-Library: `mkc-work-guardian`, `mkc-work-sentinel`, `mkc-work-context`, `mkc-work-recorder` |
| Autopilot | „Härten + Budgets": autonom ⇒ harte Denies statt Rückfragen, Tool-/Datei-Budgets, automatische Checkpoints, riskante Ops verweigert; interaktiv ⇒ Elicitation-Dialoge (confirm/select) statt Denies |
| Welten | **Work-only** (`mkc-work-*`-Prefix). Home-Variante wäre später eine separate `mkc-home-*`-Extension. Zwei-Welten-Prinzip wird im ADR ergänzt: Extensions sind welt-gebunden per Namenskonvention und teilen nur `Mkc.Copilot.Extensions.Core`. |
| Bridge | Thin-Node-Shim (`extension.mjs`, `joinSession`) ↔ .NET-Child über **JSON-Lines/stdio** (`mkc-bridge/1`); `ForUri`-Connect-back nur als ADR-Offene-Frage/Spike |
| .NET | net8.0 (wie `dotnet-starter`-Template), xUnit, System.Text.Json Source-Gen, keine externen NuGets in v1 |

**Konsequenz aus „User-Scope only":** Die Extensions wirken in **allen** Projekten des Users
(das ist der gewünschte Nutzen im Work-Alltag). Steuerung pro Projekt/Session erfolgt über
`/extensions disable <name>` bzw. eine Opt-out-Markerdatei (§4.5, Mechanik 9). Dogfooding in
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
│   │   │   ├── State/
│   │   │   │   ├── StateStore.cs                 # <cwd>/.copilot/state/extensions/mkc/…, atomare JSON-Writes
│   │   │   │   ├── Budgets.cs                    # persistente Zähler (Tool-Calls, Writes, Shell, Denials)
│   │   │   │   └── Checkpointer.cs               # `git stash create` + Diff-Patch, Checkpoint-Index
│   │   │   └── Pii/
│   │   │       └── PiiScrubber.cs                # Parität zu anonymizer-proxy-Mustern; reversible Placeholder-Map
│   │   ├── Mkc.Copilot.Extensions.Guardian/      # Head 1 (Exe): Program.cs (+ --print-manifest), GuardianExtension.cs, DefaultPolicy.cs
│   │   ├── Mkc.Copilot.Extensions.Sentinel/      # Head 2 (Exe): SentinelExtension.cs (Mode/Budgets/Checkpoints)
│   │   ├── Mkc.Copilot.Extensions.WorkContext/   # Head 3 (Exe): ContextExtension.cs, WorkConventions.cs, CommitComposer.cs
│   │   └── Mkc.Copilot.Extensions.Recorder/      # Head 4 (Exe): RecorderExtension.cs, SessionReport.cs
│   ├── tests/Mkc.Copilot.Extensions.Tests/       # xUnit: GitGuardrailsTests (inkl. sh -c/&&-Umgehung), SecretScannerTests,
│   │                                             #   PiiScrubberTests (Roundtrip), ModeDetectorTests, BudgetsTests,
│   │                                             #   CheckpointerTests (temp-git-Repo), BridgeProtocolTests (Golden Files)
│   ├── host/                                     # Auslieferungs-Einheiten (genau das, was installiert wird)
│   │   ├── lib/bridge.mjs                        # EINZIGE Shim-Logik: spawn, NDJSON-Framing, Handshake,
│   │   │                                         #   Shadow-Copy-Spawn, Restart/Fail-Policy; joinSession injizierbar
│   │   ├── mkc-work-guardian/
│   │   │   ├── extension.mjs                     # ~12 Zeilen: import ./bridge.mjs → startBridge(joinSession, {name, failMode:"closed"})
│   │   │   ├── bridge.mjs                        # Einzeiler-Re-Export: export * from "../lib/bridge.mjs"
│   │   │   └── (bin/ — publish-Output, gitignored)
│   │   ├── mkc-work-sentinel/   (extension.mjs, bridge.mjs, bin/)
│   │   ├── mkc-work-context/    (extension.mjs, bridge.mjs, bin/)
│   │   └── mkc-work-recorder/   (extension.mjs, bridge.mjs, bin/)
│   ├── shim-test/
│   │   ├── mock-harness.test.mjs                 # Fake-joinSession + ECHTE .NET-Binaries: Skript-Dialoge
│   │   └── fixtures/                             # Golden-NDJSON (init→manifest→preToolUse→deny …)
│   └── install/
│       ├── install.sh / install.ps1              # publish + link|copy nach ~/.copilot/extensions/
│       └── uninstall.sh / uninstall.ps1
├── tools/validate-extensions.mjs                 # NEU (§5)
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
- **Default-Auswahl:** guardian + sentinel + context; recorder nur mit `--with-recorder`
  (Telemetrie ist Opt-in). `uninstall` entfernt Links/Kopien und lässt projektlokalen State
  (`.copilot/state/extensions/mkc/`) unangetastet.

---

## 3. Bridge: Mechanismus + JSON-Lines-Protokoll `mkc-bridge/1`

**Entscheidung:** Thin-Shim mit `joinSession` als einziger Kontakt zur dokumentierten
Extension-Oberfläche; der .NET-Child ist ein reines stdin/stdout-Programm. Begründung:
Testbarkeit ohne CLI (Mock-Harness), Hot-Reload trivial, keine Abhängigkeit von
undokumentiertem `ForUri`-Token-Plumbing, minimale Angriffsfläche (keine NuGet-Fremdpakete).
NuGet `GitHub.Copilot.SDK` wird in v1 **nicht** referenziert; Migrationspfad (Shim schrumpft
zum URL/Token-Durchreicher, Heads auf natives SDK) im ADR als Offene Frage.

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
fail-closed"); `failMode:"open"` (context, recorder) = Hooks werden No-Ops. Timeout einer
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

### 4.3 `mkc-work-context` — Work-Konventionen (fail-open)

- **Hooks:** `userPromptSubmitted` (PII-Scrub: Email/ADO-UPN/FullName/PhoneDE → reversible
  Platzhalter pro Session; IBAN/SteuerID → Redaktion), `sessionStart` (Branch → `AB#1234`-Ticket,
  Blazor/EF-Projekt-Detection → `additionalContext`).
- **SystemMessage:** Append-Section `mkc-work-conventions` (Conventional Commits,
  git-flow-Branch-Schema, ADO-Gepflogenheiten, [CONFIRM]/[GATE]-Semantik analog AGENTS.md §2.8).
- **Commands:** `/moin` (Workday-Start: git status, offene Branches, Ticket, Tagesplan), `/commitmsg`.
- **Tools:** `compose_commit_message` (Conventional-Commits-Grammatik + AB#-Ref),
  `deanonymize_text` (SkipPermission, rein lokal via Placeholder-Map).
- **Autopilot:** `interactive` ⇒ bei IBAN/SteuerID `ui.select`
  („umformulieren / redigiert senden / abbrechen"); `autonomous` ⇒ stille harte Redaktion +
  Warn-Kontext, keine Dialoge; `/moin` verweigert sich im Autonomous-Modus (interaktives Kommando).

### 4.4 `mkc-work-recorder` — Flight-Recorder (fail-open, Opt-in)

- **Hooks/Events:** alle Session-Events → JSONL `MKC_STATE_DIR/recorder/<session>.jsonl`;
  `postToolUse` (Latenzen); `sessionEnd` → Markdown-Report nach
  `.copilot/state/artifacts/flight-<ts>.md` (Repo-Render-Pattern: garantierter Fallback).
- **Commands:** `/flightlog` (`last` inline-Kurzreport; `report` = Artefakt mit
  Tool-Latenz-Histogramm, Deny-Zählern, Compaction-Events, Turn-Statistik,
  Checkpoint-Korrelation via read-only Blick auf `checkpoints.json` des Sentinels).
- **Autopilot:** `autonomous` ⇒ Voll-Capture inkl. Argument-Digests + Checkpoint-Index;
  `interactive` ⇒ gesampelte, schlankere Aufzeichnung.

### 4.5 Clevere Mechaniken (deterministisch statt Prompt-Hoffnung)

1. **Echter Shell/git-argv-Parser** (Ketten `&&`/`;`/`|`, `sh -c "…"`, `git -C`, Quoting,
   `-f` vs. `--force-with-lease`) — schließt die Offene Frage aus ADR-0004.
2. **Persistente Budgets** über atomare JSON-Writes, sichtbar via `/budget show`.
3. **Checkpoints ohne Working-Tree-Berührung** (`git stash create` + Diff-Patch) mit Index und `/checkpoint list`.
4. **Confirm-Deadline:** jedes `ui.confirm` trägt `timeoutMs` (60 s); keine Antwort ⇒ `timedOut`
   ⇒ **deny**. Macht die Guards autopilot-sicher, selbst wenn der Sentinel deaktiviert/gestorben ist.
5. **Mode-Contract mit Stale-fails-strict-Semantik** (TTL ⇒ `autonomous`).
6. **Entropie-basierter Secret-Scan** auf Args **und** Tool-Output.
7. **Reversible PII-Platzhalter-Map** + lokales `deanonymize_text`.
8. **Wiederholungs-Gedächtnis:** 3× identisch verweigerter Versuch ⇒ eskalierender
   `additionalContext` („STOP: X ist policy-blockiert, mach Y"); im Autopilot ⇒ `abort`.
9. **Projekt-Opt-out-Marker:** Datei `.copilot/mkc-extensions.json`
   `{"disable":["mkc-work-context"]}` im Projekt ⇒ betroffene Heads schalten sich bei
   `sessionStart` selbst passiv (nötig, weil User-Scope überall wirkt).
10. **Deterministische SystemMessage aus Repo-Zustand** (Branch→Ticket, Projekttyp) statt statischer Prompts.

---

## 5. Validierung & CI

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

## 6. Docs (deutsch)

1. **`docs/adr/0010-copilot-cli-extensions.md`** (Format wie ADR-0004/0007:
   Status/Kontext/Optionen/Entscheidung/Konsequenzen/Offene Fragen). Entscheidungen: Ort
   top-level + **User-Scope-only** (Repo-Scope-Shims verworfen — Nutzen liegt in
   projektübergreifender Wirkung; Marketplace/mcp-servers verworfen — kein Plugin/kein MCP);
   Bridge JSON-Lines-Shim (vs. ForUri vs. reines Node); **4er-Schnitt** mit
   Hook-Unabhängigkeits-Prinzip („jedes Deny gewinnt", Mode-Contract nur zum Aufweichen,
   stale-fails-strict); Autopilot-Policy „Härten + Budgets"; Welt-Bindung `mkc-work-*` als
   Zwei-Welten-Erweiterung. Konsequenzen: Doppel-Wirkung mit `hooks.json`-Guards des
   Work-Plugins (redundant, Extension = strengeres Superset; Konsolidierung = Offene Frage),
   fail-closed kann nerven (bewusst, Work-Block-Ethos). Offene Fragen: ForUri-Spike,
   `@github/copilot-sdk`-Drift, Vereinheitlichung `policy/git-guardrails.json` ↔
   `DefaultPolicy.cs`, Home-Variante.
2. **`docs/extensions-bridge-protocol.md`** — kanonische Spec aus §3.
3. **`ARCHITECTURE.md`:** Struktur-Baum + neues **§10 Extensions (experimentell, Work,
   User-Scope)** mit Schnitt-Tabelle, Mode-Contract, Fail-Policies, Install-Modi.
   **`README.md`:** Struktur + Install-Zeile. **`extensions/README.md`:**
   Experimentell-Banner + getestete CLI-Version (`versions.json`).

---

## 7. Implementierungs-Reihenfolge

1. Gerüst (`sln`, `Directory.Build.props`, Core, Tests) + ADR-0010 + Protokoll-Doc
   (Spec zuerst — sie ist der Vertrag).
2. Policy-/Kern-Module rein & voll getestet: ShellCommandParser, GitGuardrails, ToolGuardian,
   SecretScanner, PiiScrubber, Budgets, ModeDetector, Checkpointer.
3. Bridge (BridgeHost/DTOs/Source-Gen) + `host/lib/bridge.mjs` (inkl. Shadow-Copy-Spawn) +
   Golden-File-/Mock-Harness-Tests.
4. Head `mkc-work-guardian` + `mkc-work-sentinel` (Sicherheitskern) → Install im Link-Modus → Dogfooding.
5. Heads `mkc-work-context`, `mkc-work-recorder`.
6. Installer (sh/ps1, link|copy, Junction-Fallback) + Uninstaller.
7. Validator + CI + package.json + ARCHITECTURE/README-Updates.

---

## 8. Verifikationsplan

1. **Unit:** `dotnet test extensions` — Parser-Umgehungen (`sh -c "git push -f"`,
   `a && git reset --hard`), Entropie-Scan, PII-Roundtrip, Mode-Sequenzen
   (Signal-A/B/C-Kombinationen), Budget-Persistenz, Checkpointer gegen temporäres git-Repo.
2. **Bridge-Mock-Harness (ohne CLI):** Fake-`joinSession` + echtes Guardian-Binary:
   init→Manifest-Assert → `preToolUse{git push --force origin main}` ⇒ deny →
   `--force-with-lease` ⇒ allow → Timeout-Simulation ⇒ fail-closed-Deny durch den Shim →
   Crash ⇒ Restart, dann fail-closed → Confirm-Deadline: `ui.confirm` unbeantwortet ⇒ deny.
   Analog Sentinel: Budget-Erschöpfung ⇒ deny; Event-Sequenz ohne `permission.request` ⇒
   `mode.json` kippt auf `autonomous`.
3. **Lokal (User-Scope, Link-Modus):** `extensions/install/install.sh --mode link` →
   `copilot` starten → `/extensions list` zeigt 4 `mkc-work-*` →
   `/extensions info mkc-work-guardian` → destruktive Git-Op anfordern ⇒ Deny mit Begründung →
   `/guardian why` → `/autopilot on` ⇒ Confirm-Fälle werden Denies, `/checkpoint list` zeigt
   Snapshot → PII tippen ⇒ Platzhalter → `/moin` → `/flightlog report` ⇒ Artefakt unter
   `.copilot/state/artifacts/` → Code ändern, `dotnet publish`, `/extensions reload` ⇒
   Shadow-Copy lädt neuen Stand → `/extensions disable mkc-work-recorder` ⇒ JSONL wächst
   nicht mehr → Opt-out-Marker in einem Zweitprojekt testen.
4. **Copy-Modus/Windows-Pfad:** `install.ps1 --mode copy` (Junction-Fallback prüfen),
   reload während laufender Session (Lock-Freiheit dank Shadow-Copy).
5. **CI:** `extensions`-Job grün; `validate-extensions` grün unter `--strict`.

---

## 9. Risiken & Pins

- **Instabile `extension.mjs`-API (größtes Risiko):** getestete CLI-Version in `versions.json`
  pinnen; Feature-Detection der `joinSession`-Optionen (fehlende Capability ⇒ Hook stumm +
  stderr-Warnung, kein Crash); stabile Grenze ist `mkc-bridge/1`, nicht die CLI-Payload.
- **`@github/copilot-sdk` auto-resolved, kein Lockfile:** Capability-Handshake +
  Payload-Normalisierung im Shim.
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
  der Experimentierphase; Konsolidierungspfad im ADR.
- **NuGet `GitHub.Copilot.SDK` ungenutzt in v1:** bewusst; ForUri-Spike als Offene Frage,
  Migration ändert nur Shim + `Program.cs`, nicht Core.

---

## 10. Referenzen

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
