# Copilot-CLI-Extensions — Systemdesign & Lückenloser Ausführungsplan

> Ergänzt `docs/Extensions_Konzept.md` (Konzept v3) um die operative Umsetzungsebene.
> **Keine offenen Punkte:** Alle früheren „Offenen Fragen" sind hier entschieden (§T2.1).
> Sprache: C#/net10.0 · Ziel: 4 lokale Copilot-CLI-Extensions (`mkc-work-*`), User-Scope.

---

# TEIL 1: SYSTEMDESIGN & KONZEPTION

## 1.1 Zusammenfassung der Architektur

```
┌──────────────────────────── Copilot CLI (Agent-Harness) ────────────────────────────┐
│  lädt aus ~/.copilot/extensions/:  mkc-work-guardian │ -sentinel │ -flow │ -recorder │
└────────────┬─────────────────┬─────────────────┬─────────────────┬──────────────────┘
     JSON-RPC (CLI-Ebene, gekapselt durch joinSession — wir implementieren sie NIE)
             │                 │                 │                 │
      extension.mjs     extension.mjs     extension.mjs     extension.mjs   ← je ~12 Zeilen
      + bridge.mjs      + bridge.mjs      + bridge.mjs      + bridge.mjs    ← 1 geteilte Shim-Lib
             │                 │                 │                 │
        mkc-bridge/1 (NDJSON über stdio — UNSER Protokoll, kein JSON-RPC 2.0)
             │                 │                 │                 │
      Guardian.dll       Sentinel.dll        Flow.dll        Recorder.dll   ← net10.0-Prozesse
             └───────┬─────────┴───────┬─────────┴───────┬─────────┘
                     │   Mkc.Copilot.Extensions.Core.dll (geteilte classlib)
                     │   Bridge · Policy · Autopilot · Workflow · Backends ·
                     │   Telemetry · State · Pii · Infrastructure(EventBus)
                     │
   Kopplung zwischen den 4 Prozessen NUR über State-Dateien (atomic rename):
   <cwd>/.copilot/state/extensions/mkc/{mode.json, denials.jsonl, current-workflow.json,
                                        budgets.json, checkpoints.json, workflows/, recorder/}
   Fachdaten local:  <cwd>/.copilot/planning/<id>/{plan.md, notes.md, links.json}
   Fachdaten remote: ADO REST 7.1 + Confluence REST v2 (direkt aus Flow.dll, PII-gescrubbt)
```

Strukturprinzipien: (1) Die Extension **ist** der .NET-Prozess; `extension.mjs` ist ein
fester Stecker ohne Fachlogik. (2) Jedes `preToolUse`-Deny irgendeiner Extension gewinnt —
kein IPC im heißen Pfad. (3) Zustand schlägt Chatverlauf: Workflows, Budgets, Modus und
Kosten leben in Dateien, nicht im Kontextfenster. (4) In-Process lose Kopplung über EventBus
(Channels), cross-process nur über State-Dateien.

## 1.2 Kernfunktion

Das System macht den Copilot-CLI-Agenten im Work-Alltag **deterministisch steuerbar,
sicher und abrechenbar**: Destruktive Operationen werden durch Code (argv-Parser) statt
Prompts verhindert; autonome Läufe (Autopilot) werden erkannt und automatisch gehärtet
(Denies, Budgets, Checkpoints); Arbeitswege (Feature/Bugfix/Doku/Review/Release …) laufen
als wiedereinsteigbare State-Machines mit minimalem Token-Verbrauch; Planung/Doku
funktioniert wahlweise lokal (Dateien) oder remote (ADO/Confluence REST) hinter einer für
das LLM unsichtbaren Fassade; und jeder Workflow bekommt eine exakte Kosten-/Modell-/
Deny-Rechnung. Mehrwert: weniger Risiko, weniger Tokens, volle Transparenz — ohne einen
einzigen zusätzlichen MCP-Server.

## 1.3 Abläufe (Hauptprozesse, chronologisch)

**A) Extension-Start (je Head identisch):**
CLI lädt `extension.mjs` → Shim spawnt `dotnet bin/<Head>.dll` (Shadow-Copy) mit ENV
(`MKC_BRIDGE_V=1`, `MKC_EXT_NAME`, `MKC_STATE_DIR`, `MKC_SESSION_ID`, `MKC_CWD`) →
Child sendet `event ready` → Shim sendet `req init {capabilities…}` → Child antwortet mit
RegistrationManifest (hooks/tools/commands/systemMessage) → Shim registriert exakt das via
`joinSession()` → Session läuft.

**B) Tool-Aufruf (heißer Pfad, Budget 2000 ms):**
Agent will Tool X ausführen → CLI feuert `preToolUse` an alle aktiven Extensions →
Shim → `req hook.preToolUse {toolName,toolArgs,turn}` → Guardian: ShellCommandParser
zerlegt argv → GitGuardrails/ToolGuardian/SecretScanner entscheiden →
`Allow | Deny(reason) | Confirm` → bei Confirm: `mode.json` lesen — `interactive` ⇒
`ui.confirm` (Deadline 60 s, Timeout ⇒ deny), `autonomous/stale/unknown` ⇒ deny →
Deny wird zusätzlich in `denials.jsonl` protokolliert. Parallel prüft Sentinel Budgets
und erzwingt im Autopilot einen Checkpoint vor der ersten mutierenden Op des Turns.

**C) Workflow (z. B. Feature):**
`/feature start "…"` → FlowExtension: Backend-Wahl (Dialog, nur interaktiv) →
`IPlanningBackend.CreateTicket` (local: plan.md; remote: ADO REST) → WorkflowState
`workflows/<id>.json` + `current-workflow.json` geschrieben → Branch-Vorschlag
(BranchNameLint-konform) → pro Step: Gates werden von `postToolUse`-Beobachtung +
Exit-Codes gefüllt; `/workflow next` schaltet nur bei erfüllten Gates; `skip` nur bei
`skippable:true` (interaktiv mit Confirm, autonom nie); `/workflow resume` nach beliebiger
Pause: `sessionStart` injiziert einen einzigen kompakten Kontextblock aus dem State.

**D) Moduswechsel local↔remote:** `/mode remote` → SyncEngine liest `links.json` →
fehlende Verknüpfungen: Dialog (anlegen/verknüpfen/lokal lassen) → REST-Calls
(PII-Scrub davor, Digest danach) → `links.json` aktualisiert. Step-Pointer unverändert.
Konflikt: interaktiv `ui.select`; autonom: lokale Kopie gewinnt + Warnung.

**E) Autopilot-Übergang:** `/autopilot on` (autoritativ) oder Heuristik (≥3
ToolExecutionStart ohne permission.request ⇒ SUSPECTED, +3 ⇒ AUTONOMOUS; User-Aktivität ⇒
eine Stufe runter) → Sentinel schreibt `mode.json` (Heartbeat alle 30 s, TTL 300 s,
stale ⇒ autonomous) → Guardian/Flow lesen bei jeder Entscheidung.

**F) Kostenrechnung:** CLI-Event `assistant.usage {model, inputTokens, outputTokens,
cachedTokens}` → Recorder: Zeile in `recorder/usage.jsonl` + Attribution über
`current-workflow.json` → `UsageAggregator` verdichtet je Session/Workflow ×
`prices.json` → `/flightlog costs|models|denies|report`.

## 1.4 Genaue Funktionsbeschreibungen

| Komponente | Verantwortung (exakt) |
|---|---|
| `host/lib/bridge.mjs` | Einzige Shim-Logik: Shadow-Copy von `bin/` → spawn Child → NDJSON-Framing (Zeilenpuffer, UTF-8) → Handshake → Registrierung bei `joinSession` → Weiterleitung aller Hook-/Tool-/Command-/Event-Aufrufe als `req`/`event` → Beantwortung von `ui.*`-Gegenrequests → Timeouts je Methode → Fail-Policy (closed: selbst `deny` antworten; open: No-Op) → 1 Restart mit Backoff → `shutdown` bei Dispose |
| `extension.mjs` (je Head) | 12 Zeilen: importiert `./bridge.mjs`, ruft `startBridge(joinSession, {name, failMode})` |
| `BridgeHost.cs` | stdin-Leseschleife, `id`-Korrelation, Dispatch auf registrierte Handler, pro Request `CancellationTokenSource` (Timeout + Shutdown-Link), stdout-Serialisierung (Source-Gen), stderr-Logging |
| `ShellCommandParser.cs` | Zerlegt Shell-Kommandos in argv-Ketten: `&&`, `;`, `\|`, Subshells, `sh -c "…"`-Rekursion, `git -C <dir>`, Quoting/Escaping — Ausgabe: Liste normalisierter Kommandos |
| `GitGuardrails.cs` | ADR-0004-Regeltabelle auf argv-Ebene: force-push (Ausnahme `--force-with-lease`, aber nie auf `main\|master\|develop\|release/*`), `reset --hard`, `clean -fd[x]`, `branch -D`, `checkout/switch -f`, `rebase` auf shared branches, `filter-branch/-repo`, `update-ref -d`, `reflog delete` |
| `ToolGuardian.cs` | Nicht-git-Denylist: `rm -rf` außerhalb `<cwd>`, `curl http://` (nur https), `chmod 777`, Paket-Publish-Kommandos, `dd`, `mkfs` |
| `SecretScanner.cs` | Regex-Familien (AWS/GitHub/ADO-PAT/JWT/PEM) + Shannon-Entropie ≥ 4,0 über Token ≥ 20 Zeichen + Kontext-Keywords (`token`, `secret`, `password`) |
| `BranchNameLint.cs` | Prüft `-b/-c`-Branch-Namen gegen `^(feature|bugfix|hotfix|release|spike)/(ab\d+-)?[a-z0-9][a-z0-9-]{2,59}$` |
| `ModeDetector.cs` / `ModeContract.cs` | State-Machine (§1.3 E) / atomarer Reader-Writer für `mode.json` mit TTL-Semantik „stale ⇒ autonomous" |
| `Budgets.cs` | Persistente Zähler in `budgets.json`; Defaults §T2.1; Erschöpfung ⇒ PolicyDecision.Deny mit Handlungsanweisung als additionalContext |
| `Checkpointer.cs` | `git stash create` (Commit-Objekt ohne Working-Tree-Änderung) + `git diff > checkpoint-<n>.patch`; Index `checkpoints.json`; Restore je Datei via `git checkout <sha> -- <file>` |
| `WorkflowEngine.cs` + `WorkflowDefinition/StepMeta` | Generischer DAG-Interpreter: `Start/Next/Skip/Add/Abort/Resume`; Gate-Auswertung nur über Exit-Codes/Dateisystem/git; Persistenz je Instanz |
| `Definitions/*` | 7 Builder-Definitionen: feature, bugfix, refactor, doc, review, security, release (Spiegel der orchestration-Plugin-Workflows, deterministisch) |
| `Meta/GoalTracker` | `goal.json` (Zieltext + Checks als Kommandos mit Erwartungs-Exit-Code); Ausführung + Ampelstatus |
| `Meta/LoopRunner` | Iteration: Checkpoint → Digest-Injektion → Warten auf SessionIdle → Checks; Abbruch: grün ∨ max ∨ Budget ∨ Fehlerbild-Hash 2× identisch |
| `Meta/SimplifyRunner` | `git diff --name-only` → je Datei LLM-Auftrag über `session`-Prompt → danach `TestsGreen`-Gate → rote Datei aus Checkpoint zurück |
| `Meta/BatchRunner` | `batch.json`-Queue (Pointer persistiert): je Task Checkpoint + Budget-Scheibe + Ergebniszeile; `resume` setzt am Pointer auf |
| `IPlanningBackend` + `LocalBackend` | Fachliche Fassade; local: plan.md/notes.md mit YAML-Front-Matter (`status`, `ado`, `steps`) |
| `AdoBackend.cs` | ADO REST 7.1: `POST /wit/workitems/$Task`, `PATCH /wit/workitems/{id}`, `POST /git/repositories/{repo}/pullrequests`; PAT Basic-Auth; PiiScrubber vor jedem Body |
| `ConfluenceBackend.cs` | Confluence Cloud REST v2: `POST/PUT /wiki/api/v2/pages`; Markdown→Storage-Format-Konverter (eigener, minimaler Satz: Überschriften, Listen, Code, Tabellen, Links) |
| `SyncEngine.cs` | Idempotenter Abgleich via `links.json`; Konfliktpfade §1.3 D |
| `PiiScrubber.cs` | Muster: E-Mail, ADO-UPN, Vor+Nachname (aus konfigurierter Namensliste), Telefon-DE, IBAN (Redaktion), SteuerID (Redaktion); Session-Placeholder-Map `pii-map.json` (nur lokal, 0600) |
| `UsageAggregator.cs` / `PriceTable.cs` / `DenyLog.cs` | §1.3 F; PriceTable aus `prices.json` mit Stand-Datum; DenyLog append-only JSONL |
| `EventBus.cs` | `Channel<TEvent>`-basiertes In-Process-Pub/Sub; Module abonnieren typisiert; kein Modul ruft ein anderes direkt |
| Heads (`GuardianExtension` …) | Nur Verdrahtung: Manifest deklarieren, Core-Module an BridgeHost-Handler binden, `--print-manifest`-Modus für den Validator |

---

# TEIL 2: DER LÜCKENLOSE AUSFÜHRUNGSPLAN

## T2.1 Hard-Coded Annahmen (gelten durchgehend; Änderung = bewusster Edit an EINER Stelle)

| Parameter | Festgelegter Wert |
|---|---|
| Repo-Wurzel | `/home/user/PersonalAgentPlugin` |
| .NET SDK / TFM / C# | SDK **10.0.100**, `net10.0`, LangVersion **14** (`global.json` pinnt SDK) |
| Getestete CLI-Version (Pin in `versions.json`) | **0.0.354** — wird bei jedem Dogfooding-Abschluss aktualisiert |
| Bridge-Protokoll | `mkc-bridge/1`; Timeouts: preToolUse/postToolUse/permission 2000 ms · userPromptSubmitted/errorOccurred 1500 ms · sessionStart/End/shutdown 3000 ms · tool/command.invoke 60 000 ms · ready-Handshake 10 000 ms |
| State-Verzeichnis | `<cwd>/.copilot/state/extensions/mkc/` · Planning: `<cwd>/.copilot/planning/` |
| mode.json | Heartbeat 30 s, TTL 300 s, stale ⇒ `autonomous` |
| Confirm-Deadline | 60 000 ms ⇒ deny |
| Budgets (Default je Session) | toolCalls 300 · shell 120 · fileWrites 150 · denials 20 · Loop max 5 Iterationen · Batch 60 toolCalls/Task |
| Branch-Regex | `^(feature\|bugfix\|hotfix\|release\|spike)/(ab\d+-)?[a-z0-9][a-z0-9-]{2,59}$` |
| ADO | `ADO_ORG_URL=https://dev.azure.com/mkrueer` · `ADO_PROJECT=Playground` · `ADO_REPO=Playground` · `api-version=7.1` · Auth: `ADO_PAT` (env/Keychain) |
| Confluence | `CONFLUENCE_BASE_URL=https://mkrueer.atlassian.net/wiki` · Space `DEV` · REST **v2** · Auth: `CONFLUENCE_USER` (= michel.krueer@googlemail.com) + `CONFLUENCE_TOKEN` |
| prices.json (Stand 2026-07-01, editierbar; €/1k Tokens) | `gpt-5`: in 0.010 / out 0.030 / cached 0.001 · `claude-sonnet-4.5`: in 0.009 / out 0.027 / cached 0.001 · `gpt-5-mini`: in 0.002 / out 0.006 / cached 0.0002 · unbekanntes Modell ⇒ Zeilen als „geschätzt (kein Preis)" |
| Entscheidungen statt Offener Fragen | **ForUri/natives SDK:** v1+v2 bleiben auf der Bridge; Re-Evaluation erst als erster Schritt einer etwaigen v3. **Fleet-Hook-Semantik:** v2-Feature; Verifikationstest ist in §T2.3 P6-V3 fest definiert. **Konsolidierung `hooks.json`-Guards:** bleiben bis Abschluss Phase 5 aktiv; Phase 6 Schritt 2 entfernt sie per PR. **anonymizer-proxy:** bleibt für `@azure-devops/mcp`-Nutzer im Marketplace; unser REST-Pfad nutzt ausschließlich PiiScrubber. **OTLP-Export:** gestrichen (nicht in v1/v2). **Home-Variante:** außerhalb des Scopes dieses Plans. |
| Installation | Linux/macOS: Symlink-Modus Default · Windows: Junction/Copy · Default-Auswahl guardian+sentinel+flow; recorder via `--with-recorder` |
| Namensliste PII (Vor-/Nachname) | `~/.copilot/extensions/mkc/pii-names.json`, initial `["Michel","Krueer"]` |

## T2.2 Schritt-für-Schritt-Anleitung

### Phase 0 — SDK-Re-Check & Gerüst (Tag 1)

**Schritt 0.1 — SDK-Feature-Detection festzurren.**
*Warum:* Streichen schlägt Bauen; außerdem braucht der Shim die Capability-Liste.
*Wie:* In einem Wegwerf-Verzeichnis prüfen, welche `joinSession`-Optionen die installierte CLI kennt:

```bash
copilot --version                     # muss >= 0.0.354 sein, Wert in versions.json eintragen
mkdir -p /tmp/mkc-probe/.github/extensions/probe && cd /tmp/mkc-probe
cat > .github/extensions/probe/extension.mjs <<'EOF'
import { joinSession } from "@github/copilot-sdk/extension";
const s = await joinSession({ hooks: {}, tools: [], commands: [] });
console.error("CAPS:", JSON.stringify(Object.keys(s), null, 0));
console.error("UI:", JSON.stringify(s.capabilities ?? {}, null, 0));
EOF
copilot -p "sage nur ok" ; # stderr zeigt die Capability-Liste → in docs/extensions-bridge-protocol.md §Capabilities eintragen
```

**Schritt 0.2 — Solution-Gerüst anlegen.**
*Warum:* Ein Commit, der baut, bevor Logik entsteht.
*Wie:*

```bash
cd /home/user/PersonalAgentPlugin && mkdir -p extensions && cd extensions
cat > global.json <<'EOF'
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }
EOF
dotnet new sln -n Mkc.Copilot.Extensions
dotnet new classlib -n Mkc.Copilot.Extensions.Core -o src/Mkc.Copilot.Extensions.Core
for h in Guardian Sentinel Flow Recorder; do
  dotnet new console -n Mkc.Copilot.Extensions.$h -o src/Mkc.Copilot.Extensions.$h
  dotnet add src/Mkc.Copilot.Extensions.$h reference src/Mkc.Copilot.Extensions.Core
done
dotnet new xunit -n Mkc.Copilot.Extensions.Tests -o tests/Mkc.Copilot.Extensions.Tests
dotnet add tests/Mkc.Copilot.Extensions.Tests reference src/Mkc.Copilot.Extensions.Core
dotnet sln add src/**/ tests/**/
```

`Directory.Build.props` (vollständig):

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <PublishReadyToRun>true</PublishReadyToRun>
    <InvariantGlobalization>true</InvariantGlobalization>
    <Version>0.1.0</Version>
  </PropertyGroup>
</Project>
```

`versions.json`:

```json
{ "bridgeProtocol": 1, "copilotCliTested": "0.0.354", "updated": "2026-07-05" }
```

### Phase 1 — Sicherheitskern: Core-Module + Bridge + Guardian/Sentinel (Woche 1–2)

**Schritt 1.1 — Envelope + BridgeHost.**
*Warum:* Das Protokoll ist der Vertrag; alles andere hängt daran.
*Wie:* `BridgeMessage.cs`:

```csharp
public sealed record BridgeMessage(
    int V, string? Id, string Type,          // "req" | "res" | "event"
    string Method, JsonElement Payload,
    bool? Ok = null, BridgeError? Error = null);
public sealed record BridgeError(string Code, string Message);
```

`BridgeHost.cs` (Kernschleife, sinngemäß vollständig):

```csharp
public sealed class BridgeHost(Stream stdin, Stream stdout, IReadOnlyDictionary<string, HookHandler> handlers)
{
    private readonly CancellationTokenSource _shutdown = new();
    public async Task RunAsync()
    {
        using var reader = new StreamReader(stdin, Encoding.UTF8);
        await EmitAsync(new("event", null, "ready", ReadyPayload()));   // Handshake Schritt 2
        while (await reader.ReadLineAsync(_shutdown.Token) is { } line)
        {
            var msg = JsonSerializer.Deserialize(line, BridgeJsonContext.Default.BridgeMessage)!;
            if (msg is { Type: "req", Method: "shutdown" }) { await AckAsync(msg); _shutdown.Cancel(); break; }
            _ = DispatchAsync(msg);                                     // parallel, id-korreliert
        }
    }
    private async Task DispatchAsync(BridgeMessage msg)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(_shutdown.Token);
        cts.CancelAfter(Timeouts.For(msg.Method));                      // Tabelle aus T2.1
        try   { await EmitResAsync(msg.Id!, ok: true,  await handlers[msg.Method](msg.Payload, cts.Token)); }
        catch (Exception ex) { await EmitResAsync(msg.Id!, ok: false, error: new("handler_error", ex.Message)); }
    }
}
```

Golden-File-Tests: Fixture-NDJSON rein → erwartete NDJSON raus (`tests/…/BridgeProtocolTests.cs`).

**Schritt 1.2 — Policy-Module (reine Funktionen, zuerst Tests).**
*Warum:* Der heiße Pfad muss beweisbar korrekt sein.
*Wie:* `ShellCommandParser` → `GitGuardrails` → `ToolGuardian` → `SecretScanner` →
`BranchNameLint`. Regelquelle: `docs/adr/0004-git-guardrails.md` +
`marketplaces/work/plugins/general/policy/git-guardrails.json`. Pflicht-Testfälle u. a.:

```csharp
[Theory]
[InlineData("git push --force origin main",              Decision.Deny)]
[InlineData("git push --force-with-lease origin feat",   Decision.Allow)]
[InlineData("git push --force-with-lease origin main",   Decision.Deny)]   // geschützter Branch
[InlineData("sh -c \"git push -f origin main\"",         Decision.Deny)]   // Umgehung
[InlineData("true && git reset --hard HEAD~3",           Decision.Confirm)]
[InlineData("git -C /tmp/x clean -fdx",                  Decision.Deny)]
```

**Schritt 1.3 — Autopilot/State-Module.** `ModeContract` (atomic rename via
`File.Replace`/temp+move), `ModeDetector` (Hysterese-Tabelle §1.3 E als Zustandsdiagramm-Tests),
`Budgets`, `Checkpointer` (Tests gegen `git init`-Tempverzeichnis), `EventBus`, `StateStore`.

**Schritt 1.4 — Shim `host/lib/bridge.mjs`.**
*Warum:* Einzige JS-Datei mit Logik — klein, aber vollständig definiert.
*Wie (Kernstruktur, vollständige Datei ~120 Zeilen):*

```js
import { spawn } from "node:child_process";
import { mkdtempSync, cpSync } from "node:fs";
export async function startBridge(joinSession, { name, failMode }) {
  const bin = shadowCopy(new URL("./bin/", import.meta.url).pathname);   // T2.1: Shadow-Copy
  const child = spawn("dotnet", [`${bin}/Mkc.Copilot.Extensions.${pascal(name)}.dll`],
    { env: { ...process.env, MKC_BRIDGE_V: "1", MKC_EXT_NAME: name,
             MKC_STATE_DIR: `${process.cwd()}/.copilot/state/extensions/mkc/`,
             MKC_CWD: process.cwd() }, stdio: ["pipe","pipe","inherit"] });
  const rpc = ndjson(child);                       // Zeilenpuffer, req/res-Korrelation, Timeouts (T2.1)
  const manifest = await rpc.handshake();          // ready abwarten → init senden → Manifest
  const session = await joinSession(toJoinOptions(manifest, rpc, { failMode }));
  wireUiRequests(rpc, session);                    // ui.confirm/select/input/elicit ← Child
  wireSessionEvents(rpc, session, manifest.wantsSessionEvents);
  return { dispose: () => rpc.shutdown() };        // /extensions reload ⇒ dispose ⇒ respawn
}
```

Fail-Policy im `toJoinOptions`: bei totem Child + `failMode:"closed"` liefert der
Hook-Wrapper selbst `{permissionDecision:"deny", permissionDecisionReason:"<name> offline — fail-closed"}`.

**Schritt 1.5 — Heads Guardian + Sentinel.**
*Warum:* Erster echter Nutzen; Manifest-Kontrakt validierbar.
*Wie:* `Program.cs` je Head: `--print-manifest` druckt das RegistrationManifest als JSON
und beendet (für Validator/CI); sonst `BridgeHost.RunAsync()`. `extension.mjs` je Head:

```js
import { joinSession } from "@github/copilot-sdk/extension";
import { startBridge } from "./bridge.mjs";
export default await startBridge(joinSession, { name: "mkc-work-guardian", failMode: "closed" });
```

**Schritt 1.6 — Installer.**
*Wie (`install/install.sh`, Kern):*

```bash
#!/usr/bin/env bash
set -euo pipefail
MODE="link"; ONLY=""; WITH_RECORDER=0
while [[ $# -gt 0 ]]; do case "$1" in
  --mode) MODE="$2"; shift 2;; --only) ONLY="$2"; shift 2;;
  --with-recorder) WITH_RECORDER=1; shift;; *) echo "unknown $1"; exit 2;; esac; done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT="mkc-work-guardian mkc-work-sentinel mkc-work-flow"
[[ $WITH_RECORDER -eq 1 ]] && DEFAULT+=" mkc-work-recorder"
EXTS="${ONLY:-$DEFAULT}"
for e in $EXTS; do
  proj="$(echo "$e" | sed 's/mkc-work-//;s/.*/\u&/')"
  dotnet publish "$ROOT/src/Mkc.Copilot.Extensions.$proj" -c Release -o "$ROOT/host/$e/bin"
  target="$HOME/.copilot/extensions/$e"; rm -rf "$target"
  if [[ "$MODE" == "link" ]]; then ln -s "$ROOT/host/$e" "$target"
  else cp -r "$ROOT/host/$e" "$target"
       cp "$ROOT/host/lib/bridge.mjs" "$target/bridge.mjs"; fi   # materialisieren
  echo "installed $e ($MODE)"
done
```

`install.ps1` analog mit `New-Item -ItemType Junction` statt `ln -s`.

**Schritt 1.7 — Mock-Harness + Dogfooding-Start.**
`shim-test/mock-harness.test.mjs`: Fake-`joinSession` (zeichnet Registrierung auf, ruft
Hooks skriptgesteuert) gegen die **echten** publizierten Binaries; Szenarien = Validierung
P1-V1…V4 (§T2.3). Danach: `./install/install.sh --mode link` und eine Woche mit
Guardian+Sentinel arbeiten.

### Phase 2 — Flow lokal (Woche 3–4)

**Schritt 2.1 — WorkflowEngine + StepMeta + Persistenz.** Builder-API und Engine wie
§1.4; Tests: skip nur bei `skippable`, add-Insertion vor aktuellem Step, Resume aus Datei,
DAG-Reihenfolge, Autopilot verbietet Pflicht-Skip.
**Schritt 2.2 — Definitionen feature/bugfix/doc** (Codebeispiel im Konzept §5.2).
**Schritt 2.3 — LocalBackend + PiiScrubber + Commands** `/moin`, `/commitmsg`, `/mode status`,
`/workflow …`, `/feature|/bugfix|/doc start`. `plan.md`-Front-Matter-Schema:

```yaml
---
id: ab1234-csv-export
status: doing            # todo|doing|done
ado: null                # z. B. "AB#1234" nach Sync
confluence: null
steps: { ticket: done, plan: done, branch: done, implement: doing, test: open, doc: skipped }
---
```

**Schritt 2.4 — sessionStart-Re-Entry-Block** (max. 400 Zeichen, deterministisch formatiert).

### Phase 3 — Remote & Sync (Woche 5–6)

**Schritt 3.1 — AdoBackend.** Endpunkte (alle mit `?api-version=7.1`, Basic-Auth `:$ADO_PAT` base64):
`POST {ADO_ORG_URL}/{ADO_PROJECT}/_apis/wit/workitems/$Task` (JSON-Patch-Body) ·
`PATCH …/wit/workitems/{id}` · `POST …/_apis/git/repositories/{ADO_REPO}/pullrequests`.
Jeder Body durch `PiiScrubber.Scrub()`, jede Antwort → Digest (Titel, Id, Status, URL).
**Schritt 3.2 — ConfluenceBackend.** `POST {CONFLUENCE_BASE_URL}/api/v2/pages`
(`spaceId` von Space `DEV` einmalig aufgelöst und in `links.json` gecacht), `PUT …/pages/{id}`
mit Versions-Inkrement; Markdown→Storage-Konverter (nur: h1-h4, p, ul/ol, code, table, a).
**Schritt 3.3 — SyncEngine + `/mode local|remote`** inkl. Konfliktpfade; Tests mit
Fake-`HttpMessageHandler`-Fixtures (aufgezeichnete JSON-Antworten unter `tests/fixtures/http/`).
**Schritt 3.4 — restliche Definitionen** refactor/review/security/release.

### Phase 4 — Meta-Workflows (Woche 7)

**Schritt 4.1 — GoalTracker** (`goal.json`: `{text, checks:[{cmd, expectExit:0}]}`; `/goal set`
erfasst Checks interaktiv per `ui.input`-Schleife).
**Schritt 4.2 — LoopRunner** (Fehlerbild-Hash = SHA256 über normalisierte Fehlerausgabe +
`git diff --stat`; 2× identisch ⇒ Stopp).
**Schritt 4.3 — SimplifyRunner**, **Schritt 4.4 — BatchRunner** (Semantik §1.4; je mit
Unit-Tests für Terminierung/Resume).

### Phase 5 — Recorder-Telemetrie (Woche 8)

**Schritt 5.1 — UsageAggregator + PriceTable** (`prices.json` initial wie T2.1;
fehlendes Modell ⇒ „geschätzt"). **Schritt 5.2 — DenyLog-Auswertung** (Reader über
`denials.jsonl`). **Schritt 5.3 — `/flightlog`-Familie** (costs [session|workflow <id>],
models, denies, last, report → Markdown nach `.copilot/state/artifacts/flight-<ts>.md`).

### Phase 6 — Härtung & Aufräumen (Woche 9)

**Schritt 6.1 — Validator + CI.** `tools/validate-extensions.mjs` (Checks: extension.mjs
vorhanden + `node --check`; bridge.mjs-Konsistenz; `--print-manifest`-Schema; Versions-Triple
`versions.json` ↔ `bridge.mjs` ↔ `BridgeMessage.cs`). CI-Job (`.github/workflows/ci.yml`):

```yaml
  extensions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: "10.0.x" }
      - run: dotnet build extensions -warnaserror
      - run: dotnet test extensions --logger trx
      - run: |
          for h in guardian sentinel flow recorder; do
            p="$(echo $h | sed 's/.*/\u&/')"
            dotnet publish extensions/src/Mkc.Copilot.Extensions.$p -c Release \
              -o extensions/host/mkc-work-$h/bin
          done
      - run: node tools/validate-extensions.mjs --strict
      - run: node --test extensions/shim-test/
```

Im selben PR: kaputten Alt-Step `mcp-servers/dotnet-mcpserver-starter` entfernen.
**Schritt 6.2 — Doppel-Guards abbauen:** `hooks.json`-tool-guardian/git-guardrails des
Work-general-Plugins per PR entfernen (Extension ist strengeres Superset — Beleg:
Deny-Parität-Testliste aus Schritt 1.2 gegen `pre-tool-guardian.sh`-Fälle).
**Schritt 6.3 — Docs:** ADR-0010 (Entscheidungen aus T2.1 übernehmen), ARCHITECTURE.md §10,
README-Install-Zeile, `extensions/README.md`.

*(v2 — Fleet/Custom Agents — startet erst nach P6-Validierung; Umfang wie Konzept §5.4.)*

## T2.3 Validierung (konkrete Prüfkriterien & Befehle)

**P0:** `dotnet build extensions` = Exit 0 · `copilot --version` ≥ `versions.json`-Pin.

**P1 (Sicherheitskern):**
```bash
dotnet test extensions --filter "Category!=Integration"      # V0: alles grün
node --test extensions/shim-test/                            # V1–V4:
```
- V1 `git push --force origin main` ⇒ `deny` mit Regel-Referenz; `--force-with-lease origin feat` ⇒ `allow`.
- V2 Child-Kill mitten in Session ⇒ 1 Restart; zweiter Kill ⇒ jede weitere preToolUse-Antwort = `deny … fail-closed` (guardian) bzw. No-Op (flow).
- V3 `ui.confirm` unbeantwortet 60 s ⇒ `deny` (Confirm-Deadline).
- V4 Event-Skript: 6× ToolExecutionStart ohne permission.request ⇒ `mode.json.mode == "autonomous"`; danach 1 UserMessage ⇒ `"suspected"`.
- V5 (manuell) `./extensions/install/install.sh --mode link` → `copilot` → `/extensions list` zeigt guardian+sentinel+flow „running"; `/guardian status` antwortet; `rm`-Provokation außerhalb cwd ⇒ Deny sichtbar.

**P2:** `/feature start "Demo"` erzeugt `plan.md` + `workflows/<id>.json`; CLI-Neustart ⇒
sessionStart-Block ≤ 400 Zeichen mit korrektem Step; `/workflow skip doc` ok, `/workflow skip test`
verlangt Confirm; im Autopilot (`/autopilot on`) wird derselbe Skip verweigert.

**P3:** `MKC_HTTP_FIXTURES=replay dotnet test --filter SyncEngineTests` grün (Idempotenz:
2× `/mode remote` ⇒ genau 1 WorkItem). Manuell gegen `ADO_PROJECT=Playground`: WorkItem
entsteht, `links.json.ado` gefüllt, PII-Testname erscheint remote als Platzhalter.

**P4:** Loop mit absichtlich rotem Check + identischem Fehler ⇒ stoppt nach 2 Iterationen
mit „no progress"; `/batch add` ×3 → `run` → Abbruch nach Task 1 → `resume` startet bei Task 2.

**P5:** Golden-Event-Fixture (12 usage-Events, 2 Modelle, 1 Workflow-Wechsel) ⇒
`/flightlog costs` Summen == vorgerechnete Erwartung auf den Cent; Modell ohne Preis ⇒
Ausgabe trägt „geschätzt"; `/flightlog denies` == Zeilenzahl `denials.jsonl`.

**P6:** CI-Job `extensions` grün · `node tools/validate-extensions.mjs --strict` Exit 0 ·
Deny-Paritätsliste Extension ⊇ `pre-tool-guardian.sh` belegt · Windows-Smoke:
`install.ps1 --mode copy` + reload ohne Lock-Fehler.

**End-to-End-Abnahme (nach P6, 30 min Skript):** Feature remote anlegen → 2 Steps → offline
`/mode local` → weiterarbeiten → `/mode remote` Sync ohne Duplikat → `/autopilot on` →
Batch mit 2 Tasks → morgens `/flightlog report` zeigt Kosten je Workflow, Modelle, Denies →
`/extensions disable mkc-work-recorder` stoppt `usage.jsonl`-Wachstum.
