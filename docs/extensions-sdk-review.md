# Erkenntnisse nach Untersuchung des echten Copilot-SDK

> Nach der Installation von **GitHub Copilot CLI 1.0.68** und dem Studium des gebündelten
> `@github/copilot-sdk` (SDK-Protokoll 3, `.d.ts` + `docs/` + `generated/session-events`)
> sind Dinge sichtbar geworden, die beim Planen (auf Basis der Community-Artikel) unklar,
> falsch angenommen oder gar nicht bekannt waren. Ergänzt `extensions-capability-alignment.md`
> (reine Payload-Abgleiche) um die **tiefer liegenden** Design-Erkenntnisse.

## A. Jetzt behobene echte Defekte (durch das SDK aufgedeckt)

1. **Falscher Compaction-Event-Name.** Wir mappten `session.usage_info`/`compaction.complete`
   → „Compaction". Real heißen die Events **`session.compaction_start` / `session.compaction_complete`**
   (`session.usage_info` ist Kontextfenster-Info, kein Compaction-Signal). ⇒ Der Recorder hätte
   Compactions **nie** gezählt. **Fix:** `session.compaction_complete`→Compaction.
2. **`skipPermission` und `defer` fälschlich weggelassen.** Beim ersten Real-Abgleich hatten wir
   im Shim `skipPermission`/`defer` entfernt. Real existieren beide (`skipPermission?: boolean`,
   **`defer?: "auto" | "never"`**). ⇒ `deanonymize_text` hätte unnötig um Erlaubnis gefragt, und
   defer-fähige Tools wurden nicht lazy geladen (Prompt-Token-Verschwendung). **Fix:**
   `skipPermission:true` + `defer:"auto"` werden jetzt durchgereicht.
3. **Fehlendes Capability-Gating vor `session.ui.*`.** Die UI-Methoden **werfen**, wenn der Host
   keine Elicitation kann (`session.capabilities.ui.elicitation !== true`). Wir riefen sie
   ungeprüft. ⇒ In einem Nicht-TUI-Host wären Confirm-Dialoge Exceptions statt sauberer Denies.
   **Fix:** `uiAvailable()` prüft die Capability + try/catch ⇒ Fallback auf `timedOut` (fail-safe deny).

## B. Falsche Grundannahme (aus den Community-Artikeln)

**„Der Multi-Language-SDK unterstützt Extensions in .NET/Python/Go."** — Das vermischt **zwei
verschiedene SDKs**:

- Das **App-Embedding-SDK** (`GitHub.Copilot.SDK` u. a.) ist multi-language und bettet den
  Copilot-Agenten in eigene Anwendungen ein.
- Das **CLI-Extension-System** ist **Node-only**: Die CLI forkt `extension.mjs` und injiziert
  das gebündelte `@github/copilot-sdk` (Node) per Resolver-Hook (`extension_bootstrap.mjs`).
  Einen .NET-/Python-Einstieg für *Extensions* gibt es nicht.

**Konsequenz:** Unsere „.NET-Extension über einen Node-Stecker + `mkc-bridge`" ist kein Bonus,
den der Multi-Language-SDK segnet, sondern ein **bewusster Workaround**, um den .NET-Wunsch im
Node-only-Extension-Modell zu erfüllen. Das ist legitim und funktioniert — aber der Zwei-Prozess-
Hop ist inhärent, nicht optional (relevant für §D).

## C. Fähigkeiten, die wir bisher nicht nutzen (echter Mehrwert möglich)

1. **Strukturierter PermissionRequest.** Der `onPermissionRequest`-Flow liefert **bereits
   geparste** Shell-Kommandos: `PermissionRequestShell { commands: […], fullCommandText }` inkl.
   `PermissionRequestShellPossibleUrl`. ⇒ Für die *Permission*-Ebene bräuchten wir unseren
   `ShellCommandParser` nicht — die CLI parst schon. Enforcement über `onPermissionRequest` mit
   strukturierten Kommandos wäre **robuster** als unser String-Parsing im `preToolUse`-Hook
   (der Parser bleibt für preToolUse nützlich, aber die Permission-Ebene ist die härtere Grenze).
2. **`permissionDecision: "ask"`.** Neben allow/deny gibt es **`ask`** — die CLI fragt dann
   **nativ** nach. Für interaktive Confirm-Fälle könnten wir `ask` zurückgeben statt unsere
   eigene `ui.confirm`+Deadline-Maschinerie zu fahren. Einfacher, nativer, weniger Code
   (die Deadline-Mechanik bliebe nur für den Autopilot-Fall nötig).
3. **`overridesBuiltInTool`.** Wir könnten das eingebaute Shell-/Edit-Tool **überschreiben** und
   unsere Prüfung direkt im Tool-Handler erzwingen — statt nur beobachtend im Hook.
4. **Aggregierte Usage bei `session.shutdown`.** Die CLI liefert am Sessionende **per-Modell-
   Metriken** (`ShutdownModelMetricUsage`, `totalTokens`). ⇒ Unser Recorder summiert usage-Events
   selbst nach; die CLI-Aggregate wären autoritativer. Unser Alleinstellungswert bleibt die
   **Workflow-Attribution** (die die CLI nicht kennt) — den Rest könnten wir übernehmen statt nachbauen.
5. **`onUserInputRequest` / `ask_user`.** Der Agent kann strukturiert Nutzer-Input anfordern —
   nutzbar, um die `/goal`-Check-Erfassung nativ statt über unsere ui.input-Schleife zu machen.
6. **Elicitation-Formulare (JSON-Schema) & Canvas.** `session.ui.elicitation({schema})` erlaubt
   **strukturierte Formulare** (statt confirm/select/input einzeln); `capabilities.ui.canvases`
   erlaubt **gerenderte** Ausgaben. ⇒ `/flightlog report` oder `/goal set` könnten reichhaltiger sein.
7. **SystemMessage-Section-Transforms.** Reale API kann Sections gezielt `replace/remove/append/
   prepend/transform` (benannte Sections wie `code_change_rules`, `safety`). Wir nutzen nur `append`.
   ⇒ Feinere Steuerung der Work-Konventionen möglich.

## D. Architektur-Erkenntnisse (größere Hebel, bewusst als Empfehlung)

1. **Hot-Path-Latenz des Zwei-Prozess-Hops.** `preToolUse` hat ein 2000-ms-Budget; jeder
   Tool-Call macht einen IPC-Roundtrip Node-Stecker ↔ .NET. Zwei Optionen:
   - **NativeAOT** für die Heads (aktuell nur ReadyToRun bei gesetzter RID): drastisch schnellerer
     Kaltstart + kleinerer Speicher, wichtig falls Prozesse doch neu starten.
   - **Guardian in den JS-Stecker ziehen:** Die Guardrails sind einfach und latenzkritisch. Eine
     JS-Portierung *nur* des `preToolUse`-Enforcements (Parser + Deny-Liste) spart auf jedem
     Tool-Call den .NET-Hop; Flow/Recorder/Sentinel blieben .NET. Bricht bewusst mit „alles in
     .NET", ist aber der ehrlichste Weg, das 2-s-Budget robust zu halten.
2. **`onPermissionRequest` als primäre Enforcement-Ebene** (statt `preToolUse`): strukturierte
   Kommandos (§C.1), native Ask-Semantik (§C.2), und es ist die Ebene, die die CLI ohnehin für
   Berechtigungen nutzt — weniger Umgehungsfläche.
3. **Weniger selbst aggregieren:** Usage-Totale (§C.4) und Compaction/Kontext-Info kommen fertig
   von der CLI; unser Code sollte sich auf das konzentrieren, was die CLI *nicht* hat
   (Workflow-Zustand, Attribution, Policy, Budgets).

## E. Bestätigt-korrekte Annahmen (kein Handlungsbedarf)

- Zwei-Ebenen-Protokoll (JSON-RPC CLI↔Stecker via `joinSession`, eigenes NDJSON darunter): tragfähig.
- Discovery aus `.github/extensions/` + User-Verzeichnis, Fork je `extension.mjs`, SDK-Auto-Resolve.
- Hooks/Commands/Tools/Elicitation/Events existieren wie geplant; `auto_mode_switch`-Event ist ein
  besseres Autopilot-Signal als unsere Heuristik (bereits genutzt).
- Sub-Agent-Hooks: `BaseHookInput.sessionId` unterscheidet Sub-Agenten — unsere Guards wirken
  automatisch auch dort (im echten Betrieb noch zu bestätigen).

## Empfohlene Priorität

1. **Sofort (erledigt):** die drei Defekte aus §A.
2. **Als Nächstes (klein, hoher Wert):** `ask`-Decision für interaktive Confirms (§C.2);
   `session.shutdown`-Aggregate im Recorder (§C.4).
3. **Mittel:** Enforcement auf `onPermissionRequest` mit strukturierten Kommandos umstellen (§C.1/§D.2).
4. **Größer/Abwägung:** Guardian-Hot-Path in den JS-Stecker oder NativeAOT (§D.1) — erst nach einem
   realen Latenz-Benchmark mit Token (E2E-Blocker A1) entscheiden.
