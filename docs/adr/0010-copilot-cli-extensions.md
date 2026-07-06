# ADR-0010 — Experimentelle Copilot-CLI-Extensions (.NET, Work-Welt)

## Status
Accepted · 2026-07-05 · experimentell · Konzept: `docs/Extensions_Konzept.md`,
Ausführungsplan: `docs/Extensions_Ausfuehrungsplan.md`

## Kontext
Die beiden Marketplaces sind prompt-basiert (Skills, Hooks, Agents). Die GitHub-Copilot-CLI
bietet zusätzlich ein **lokales Extension-System** (`.github/extensions/` bzw.
`~/.copilot/extensions/`): ein Verzeichnis mit `extension.mjs` wird als eigener Kindprozess
geladen und erhält über `joinSession()` die volle Harness-Oberfläche (Hooks, Tools, Commands,
Elicitation, SystemMessage, Event-Stream). Das erlaubt **deterministische, zustandsbehaftete,
testbare** Logik statt Prompt-Hoffnung — genau richtig für Git-Guardrails, Autopilot-Härtung,
Workflows und Kosten-Telemetrie. Dies ist **kein** MCP-Server, **kein** Copilot-Plugin und
**keine** GitHub-App-Extension.

## Optionen
- **A — Weiter nur Prompt/Hooks-Skripte:** einfach, aber String-Matching (siehe ADR-0004
  Offene Frage), kein Zustand, nicht unit-testbar.
- **B — Eine .NET-Extension, alles-oder-nichts:** ein Prozess, ein `/extensions`-Schalter.
  Einfachster Start, aber grobe Aktivierungsgranularität.
- **C — Vier .NET-Extensions mit gemeinsamer Core-Library, einzeln schaltbar.** Feinere
  Kontrolle (`/extensions enable|disable`), klare Trennung Sicherheitskern / Autopilot /
  Workflows / Telemetrie; geteilter Code in `Mkc.Copilot.Extensions.Core`.

## Entscheidung
**Option C.** Vier Heads mit `mkc-work-*`-Präfix (Work-Welt), gemeinsame Core-Library:

| Extension | Zweck | Fail-Modus |
|---|---|---|
| `mkc-work-guardian` | Git-Guardrails (argv-Parser), Tool-Guardian, Secret-Scan, Branch-Lint | closed |
| `mkc-work-sentinel` | Autopilot-Erkennung (mode.json), Budgets, Checkpoints | closed |
| `mkc-work-flow` | Workflows (7 Definitionen), Local/Remote-Backends, PII-Scrub, Meta-Workflows | open |
| `mkc-work-recorder` | Telemetrie: Kosten je Session/Workflow, Modelle, Denies | open (Opt-in) |

Weitere fixierte Entscheidungen:

1. **Echte Extension, kein Overlay.** `extension.mjs` ist ein fester ~12-Zeilen-Stecker; die
   gesamte Logik liegt im .NET-Prozess (net10.0). Nur der Stecker fällt weg, falls die CLI
   später Binaries direkt lädt.
2. **Zwei Protokollebenen.** CLI↔Stecker = JSON-RPC der CLI, komplett durch `joinSession`
   gekapselt (wir implementieren sie nie). Stecker↔.NET = eigenes NDJSON-Envelope
   **`mkc-bridge/1`** (`docs/extensions-bridge-protocol.md`) — bewusst **kein** JSON-RPC 2.0
   (kein Batch/Notification/`error.data` nötig; flach source-generierbar + golden-file-testbar).
3. **Kopplung nur über State-Dateien.** Die vier Prozesse teilen keinen Speicher; jedes
   `preToolUse`-Deny irgendeiner Extension gewinnt (kein IPC im heißen Pfad). Aufweichen
   (Deny→Confirm interaktiv) läuft über `mode.json` (TTL 300 s, **stale ⇒ autonomous**).
   In-Process-Kopplung innerhalb eines Heads über EventBus (Channels).
4. **Autopilot „Härten + Budgets".** Autonom ⇒ Confirm-Fälle werden Denies, Budget-Grenzen,
   Checkpoint-Pflicht vor mutierenden Ops. Interaktiv ⇒ `ui.confirm`/`ui.select` (Confirm-
   Deadline 60 s ⇒ Deny — autopilot-sicher auch ohne Sentinel).
5. **Kein ADO-/Confluence-MCP.** Der Remote-Modus ruft ADO REST 7.1 und Confluence REST v2
   direkt aus C# (PII-Scrub vor jedem Call, Antwort→Digest). Eine Tool-Fassade
   (`IPlanningBackend`), zwei Backends (local/remote) — für das Modell unsichtbar umschaltbar.
6. **User-Scope-only.** Quelle in `extensions/`, Installation via `install.sh|ps1` nach
   `~/.copilot/extensions/`. Kein `.github/extensions/` im Repo. Projekt-Opt-out via
   `.copilot/mkc-extensions.json`.

## Konsequenzen
- **Positiv:** Guardrails sind jetzt argv-basiert und schließen die ADR-0004-Offene-Frage
  (`sh -c`, Ketten, `git -C`, `--force-with-lease` vs. `-f` werden korrekt erkannt); Workflows
  sind wiedereinsteigbar (Zustand statt Chatverlauf = größter Token-Hebel); jeder Workflow
  bekommt eine exakte Kosten-/Modell-/Deny-Rechnung; alles ist unit- und mock-harness-getestet.
- **Doppel-Guarding:** Bis die Extensions produktiv sind, laufen die `hooks.json`-tool-guardian/
  git-guardrails des Work-`general`-Plugins parallel (redundant, Extension = strengeres
  Superset). Konsolidierung: nach Dogfooding per PR die hooks.json-Guards entfernen.
- **Fail-closed kann nerven:** guardian/sentinel antworten bei Ausfall selbst mit Deny. Bewusst
  gewählt (Work-Block-Ethos).
- **`extension.mjs`-API ist instabil:** getestete CLI-Version in `versions.json` gepinnt;
  Feature-Detection der `joinSession`-Optionen; stabile Grenze ist `mkc-bridge/1`.

## Nachtrag Phase 8 (Anhebung/„Could", 2026-07-06)
- **ForUri/natives SDK statt Stecker — geklärt: NICHT anwendbar aufs Extension-Modell.**
  Die reale CLI 1.0.68 lädt Extensions ausschließlich durch **Fork von `extension.mjs`** und
  Anbindung via `joinSession()` (`preloads/extension_bootstrap.mjs`, SDK per Resolver-Hook).
  Einen dokumentierten `ForUri`-Connect-back für *Extensions* gibt es nicht — er betrifft das
  eigenständige App-SDK, nicht dieses Szenario. Der Stecker bleibt die korrekte, alternativlose
  Grenze. Damit ist dieser Punkt erledigt (kein v3-Umbau nötig/möglich).
- **Embedding-basierte Kontext-Injektion — CLI-seitig, nicht durch uns umsetzbar.** Wir halten
  nur unsere SystemMessage-Sections klein/thematisch (bereits umgesetzt), damit das
  CLI-Retrieval greift. Kein eigener Code.
- **Fleet-Kostenattribution — umgesetzt.** Shim mappt `subagent.started/completed/failed` und
  reicht `initiator` auf `assistant.usage` durch; Recorder: `/flightlog fleet` (Kosten je
  Subagent), `/flightlog export` (OTLP-JSON-Lines).
- **Adaptive Policy — umgesetzt.** Guardian schlägt bei Deny konkrete Auswege vor
  (force→force-with-lease etc.); Sentinel `/budget suggest` aus der Recorder-Historie.
- **Home-Welt-Semantik — als Warn-Modus umgesetzt.** `GitPolicy.Mode = Warn` (via
  `policy.json` `"mode":"warn"`) stuft nicht-geschützte destruktive Ops auf Confirm herab;
  force-push auf geschützte Branches bleibt hart Deny (ADR-0004). Eine vollständige separate
  `mkc-home-*`-Extensionfamilie bleibt ein config-getriebener Folgeschritt.

## Offene Fragen
- Fleet-Hook-Semantik (wirken Extension-Hooks auf Subagent-Tool-Calls?) — nur im echten
  Dogfooding mit Token verifizierbar (siehe `docs/extensions-capability-alignment.md`).
- Vereinheitlichung `policy/git-guardrails.json` (Marketplace) ↔ `DefaultPolicy.cs` (Extension).
- Voll LLM-getriebener E2E-Lauf (A1) — braucht GitHub-Token + interaktives TUI.
