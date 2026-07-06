# Capability-Abgleich: reale Copilot-CLI-API vs. unsere Annahmen

> Verifiziert gegen die **installierte GitHub Copilot CLI 1.0.68** (gebündeltes
> `@github/copilot-sdk`, SDK-Protokoll **3**). Quelle: die `.d.ts`-Dateien und `docs/` im
> Paket `@github/copilot-linux-x64/copilot-sdk`. Dieses Dokument hält fest, was real bestätigt
> wurde und welche unserer Planungsannahmen korrigiert werden mussten.

## Bestätigt (real vorhanden)

- **Lademechanismus:** Die CLI scannt `.github/extensions/` (Projekt) und das User-Config-
  Extensions-Verzeichnis nach `<name>/extension.mjs` (nur ESM). Jede Extension wird als
  Kindprozess geforkt (`preloads/extension_bootstrap.mjs`), `@github/copilot-sdk` wird per
  Resolver-Hook automatisch aufgelöst (ENV `COPILOT_SDK_PATH`, `EXTENSION_PATH`, `SESSION_ID`).
  ⇒ Unsere Architektur (fester `extension.mjs`-Stecker → .NET-Child) ist tragfähig.
- **`joinSession(config)`** aus `@github/copilot-sdk/extension` — genau wie geplant.
- **Hooks** existieren: `onPreToolUse`, `onPostToolUse`, `onPostToolUseFailure`,
  `onUserPromptSubmitted`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred`, `onPreMcpToolCall`.
- **`preToolUse`-Output:** `permissionDecision: "allow" | "deny" | "ask"`, `permissionDecisionReason`,
  `modifiedArgs`, `additionalContext`, `suppressOutput`.
- **Custom Commands** (`CommandDefinition { name, description?, handler }`), **Tools**
  (`{ name, description, parameters, handler }`), **`systemMessage`**, **Elicitation**
  (`session.ui.confirm/select/input`), **Event-Stream** (`session.on(handler)`), inkl.
  **`assistant.usage`** und **`auto_mode_switch.completed`**.
- **Verwaltung:** `/extensions list | enable | disable | reload` und `/clear` (löst ebenfalls
  Reload aus) sind reale Slash-Commands der CLI.

## Korrigiert (Annahme → Realität)

| Thema | Ursprüngliche Annahme | Reale API (1.0.68) | Fix |
|---|---|---|---|
| Hook-Keys | `hooks.preToolUse` … | `hooks.onPreToolUse` … (`onXxx`) | Shim registriert `onXxx` |
| Command-Ausgabe | Handler gibt Text zurück | Handler gibt **`void`**, Ausgabe via **`session.log(text)`** | Shim ruft `session.log` mit dem vom Head gelieferten Text |
| Tool-Schema | Feld `inputSchema` | Feld **`parameters`** | Shim mappt `inputSchema`→`parameters` |
| sessionStart | `{ resumed: bool }` | `{ source: "startup"\|"resume"\|"new" }` | Shim: `resumed = source === "resume"` |
| Tool-Fehler | `postToolUse` mit `error` | eigener **`onPostToolUseFailure`**-Hook; `onPostToolUse` nur bei Erfolg (`toolResult`) | Shim registriert beide, TestsGreen-Marker aus Failure-Hook |
| Autopilot | nur Heuristik (ToolStart-Zählung) | reale Events **`auto_mode_switch.requested/completed`** | Sentinel nutzt `AutoModeSwitch` autoritativ, Heuristik als Fallback |
| usage-Felder | `inputTokens/outputTokens/cachedTokens` | `inputTokens/outputTokens/**cacheReadTokens**/**cacheWriteTokens**/**cost**/model` | Shim: `cachedTokens = cacheRead+cacheWrite`; Recorder bevorzugt reale `cost` |
| Reload | `/extensions reload` | **bestätigt** — `/extensions list\|enable\|disable\|reload` existieren real; zusätzlich löst **`/clear`** einen Reload aus | keine Änderung nötig |
| Shutdown | Kill nach 3 s | CLI sendet SIGTERM, **SIGKILL nach 5 s** | unkritisch; Child beendet sich auf `shutdown` sauber |
| CLI-Version-Pin | `0.0.354` (Platzhalter) | **1.0.68**, SDK-Protokoll 3 | `versions.json` aktualisiert |
| Event-Namen | `ToolExecutionStart` etc. (intern) | `tool.execution_start`, `tool.execution_complete`, `assistant.usage`, `agent_idle`, `auto_mode_switch.completed`, `session.usage_info` | Shim-`EVENT_MAP` real→intern |

## Nicht verifizierbar in dieser Umgebung (ehrliche Grenze)

Ein **voll LLM-getriebener E2E-Lauf** ist hier nicht möglich: `copilot` verlangt GitHub-Auth
(`COPILOT_GITHUB_TOKEN`/`GH_TOKEN`/OAuth), die in dieser Sandbox nicht vorliegt, und
Extensions binden an die **interaktive Foreground-Session**. Daher gilt weiterhin **offen**:

- Tatsächliches Discovery + Fork unserer Extensions durch die laufende CLI.
- Reihenfolge/Aggregation mehrerer Extension-Hooks („jedes Deny gewinnt") im realen Betrieb.
- Verhalten von `session.ui.*` im echten TUI.

**Ersatz-Verifikation:** Der Shim-Regressionstest (`shim-test/shim-bridge.test.mjs`) fährt
unser `startBridge` mit einer Fake-`joinSession`, die exakt die reale SDK-Oberfläche nachbildet
(onXxx-Hooks, `session.log`, `session.on(handler)`, `parameters`, reale usage-Felder), gegen
die **echten .NET-Binaries**. Damit ist der Adapter gegen den **autoritativen Typ-Kontrakt der
CLI** geprüft — der letzte fehlende Schritt ist ein Lauf mit gültigem Token auf einer echten
Workstation (Checkliste unten).

## E2E-Checkliste (mit Token, auf echter Workstation)

1. `npm i -g @github/copilot` · `export COPILOT_GITHUB_TOKEN=…`
2. `extensions/install/install.sh --mode link --with-recorder`
3. `copilot` starten → prüfen, dass die vier `mkc-work-*` geladen werden (Bootstrap-stderr).
4. Destruktive Git-Op anfordern ⇒ Guardian-Deny sichtbar; `/guardian why`.
5. `/feature start "…"`, `/workflow next`, `/mode`, `/companions list`, `/flightlog costs`.
6. `--autopilot` bzw. `/` Autopilot-Toggle ⇒ `auto_mode_switch`-Event ⇒ Sentinel härtet.
7. Datei ändern, `dotnet publish`, `/clear` ⇒ Reload mit neuem Stand.
