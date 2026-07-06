# Copilot-CLI-Extensions — Weg zur Produktreife

> Ergänzt `Extensions_Konzept.md` (Konzept), `Extensions_Ausfuehrungsplan.md` (Umsetzung)
> und ADR-0010. Stand: der 7-Phasen-Plan ist umgesetzt und CI-grün. Dieses Dokument sagt
> **ehrlich**, was zwischen „funktioniert im Test" und „produktiv einsetzbar" noch fehlt.

---

## 1. Ehrlicher Ist-Stand

### Umgesetzt & verifiziert (Unit + Mock-Harness, nicht gegen echte CLI)
- Sicherheitskern: argv-Parser, Git-Guardrails (ADR-0004), Tool-Guardian, Secret-Scan,
  Branch-Lint; Guardian fail-closed inkl. Confirm-Deadline.
- Autopilot: ModeDetector + mode.json (stale⇒autonomous), Budgets, Checkpoints.
- Flow: generische WorkflowEngine (7 Definitionen), LocalBackend, PII-Scrub, Re-Entry.
- Remote: ADO/Confluence REST, SyncEngine (idempotent), `/mode`.
- Meta: Goal/Loop/Simplify/Batch (deterministische Terminierung getestet).
- Recorder: Kosten je Session/Workflow, `/flightlog`.
- Bridge `mkc-bridge/1`, Shim mit Fail-Policy (nach Review gehärtet), Installer, Validator, CI.

### Teil-realisiert (gegenüber Plan bewusst zu vervollständigen)
| Thema | Ist | Soll (Plan) |
|---|---|---|
| Tool-Fassade | nur `compose_commit_message`, `deanonymize_text` als Tools | zusätzlich `planning_read/write`, `doc_draft/doc_publish` — die „für das Modell unsichtbare" Fassade ist erst damit vollständig |
| Loop/Batch-Antrieb | Entscheidungslogik getestet; Auslösung nur manuell via `/loop status` | echte Iteration über Agent-Turns (der Head muss den Agenten anstoßen — s. §2.B) |
| Simplify | listet nur geänderte Dateien | dateiweiser LLM-Pass + automatischer Rollback rot⇒Checkpoint |
| Goal-Checks | fester Default `dotnet test` | interaktive Erfassung mehrerer Checks (`ui.input`-Schleife) |
| Confluence spaceId | pro Call aufgelöst | einmalig auflösen + in `links.json` cachen |
| Flow-Events | abonniert keine Session-Events | `SessionIdle` für automatische Loop-Iteration |

### Bewusst aufgeschoben (ADR-0010 Offene Fragen)
Fleet/Custom Agents (v2) · ForUri/natives SDK statt Stecker (v3) · Konsolidierung der
`hooks.json`-Guards + anonymizer-proxy-Pfad · Home-Variante.

### Die größte Einzel-Lücke
**Nichts lief je gegen die echte Copilot-CLI.** Alle Nachweise sind Unit-Tests und ein
Mock-Harness, der das Protokoll nachstellt. Solange kein E2E-Lauf gegen `copilot` existiert,
ist die Kernannahme (die CLI ruft unsere Hooks/Commands wie erwartet auf) **unbestätigt**.

---

## 2. Produktreife-Lücken nach Kategorie

### A — Realer CLI-Nachweis (Blocker)
1. **E2E gegen echte CLI:** `copilot` installieren, alle vier Extensions user-scope
   installieren, ein Skript-Szenario (Deny, Confirm, `/feature`, `/mode`, `/flightlog`,
   `/extensions reload`) durchfahren und die Ausgaben assert-en. Ohne das ist kein Produktiv-Go.
2. **Capability-Verifikation:** Der in Phase 0 geplante `--print-manifest`/Probe-Schritt gegen
   die reale `joinSession`-API (welche Hook-Namen, welche Event-Kinds, welche ui.*-Signaturen
   die CLI tatsächlich liefert). Payload-Feldnamen (`toolName` vs. `tool_name`, Event-`kind`)
   müssen gegen die reale CLI abgeglichen und im Shim-Normalizer fixiert werden.
3. **Version-Pinning + Drift-Alarm:** getestete CLI-Version in `versions.json` gegen die
   installierte prüfen; bei Abweichung Warnung statt stiller Fehlfunktion.

### B — Funktionale Vervollständigung
4. **Tool-Fassade komplett:** `planning_read/write`, `doc_draft/doc_publish` als Tools über
   `IPlanningBackend` — erst damit ist der Moduswechsel local↔remote für das Modell wirklich
   unsichtbar (der eigentliche Token-Vorteil).
5. **Loop/Batch echte Steuerung:** Klären, ob eine Extension den Agenten aktiv anstoßen kann
   (SDK: `session.SendAsync`/enqueue) oder nur reaktiv via `additionalContext` + `SessionIdle`.
   Danach die Runner an den realen Turn-Zyklus hängen (Checkpoint → Injektion → Idle → Checks).
6. **Simplify-Orchestrierung** und **interaktive Goal-Checks** (§1) fertigstellen.
7. **Sync-Konfliktpfad** (beide Seiten geändert) real implementieren — bisher nur Push/Pull,
   der im Plan beschriebene `ui.select`-Konflikt-Dialog fehlt.

### C — Robustheit & Betrieb
8. **State-Schema-Versionierung + Migration:** Alle JSON-Dateien tragen bislang kein
   `schemaVersion`. Ein Feld + Migrationslogik verhindert Bruch bei Formatänderungen.
9. **Concurrency-Sicherheit:** Zwei parallele CLI-Sessions im selben Repo schreiben
   dieselben State-Dateien (budgets.json, workflows/…). Atomic-rename schützt Einzelschreiben,
   aber nicht Read-Modify-Write-Races. Datei-Lock (advisory) oder Session-scoped Unterordner nötig.
10. **Strukturiertes Logging + Rotation:** stderr-Logs sind unstrukturiert und unbegrenzt.
    JSON-Lines-Log mit Level + Rotation (z. B. 90-Tage wie der Marketplace-Audit-Log).
11. **Zeit/Locale:** `InvariantGlobalization` ist an; Kosten-/Datumsformatierung explizit
    invariant halten (Dezimaltrennzeichen im `/flightlog`).
12. **Graceful Degradation testen:** REST-Timeouts, ADO 429 (Rate-Limit), Confluence-5xx —
    definierte Fallbacks (auf local, mit Retry/Backoff) sind teils da, aber ungetestet.

### D — Sicherheit
13. **PII-Namensliste ist statisch** (`["Michel","Krueer"]`). Produktiv braucht es eine
    gepflegte/erweiterbare Quelle (ADO-Team-Mitglieder?) — sonst rutschen fremde Namen durch.
14. **Secret-Scanner-Recall härten:** mehr Muster (Azure/GCP/Slack/Stripe…), regelmäßige
    Pflege, Test gegen ein Corpus bekannter Secrets (False-Negative-Rate messen).
15. **PAT/Token-Handling:** aktuell nur `${env:…}`. Echte OS-Keychain-Anbindung (Plan §2.5)
    + Token-Rotation/Ablauf-Behandlung; niemals in Logs/State (Digest-Prinzip prüfen).
16. **Audit-Integrität:** `denials.jsonl`/`usage.jsonl` sind append-only, aber nicht
    manipulationssicher. Für Revision ggf. Hash-Ketten oder Read-only-Rotation.
17. **Confluence/ADO TLS** über den Agent-Proxy verifizieren (CA-Bundle, kein Verify-Disable).

### E — Qualität & Test
18. **Windows-CI-Matrix:** Junction-Install, Shadow-Copy gegen DLL-Locks, pwsh-Installer —
    bisher nur auf Linux getestet. GitHub-Actions-`windows-latest`-Job ergänzen.
19. **Mehr-Extension-Aggregation real prüfen:** „jedes Deny gewinnt" ist Design-Annahme; die
    reale CLI-Reihenfolge/Zusammenführung mehrerer Extension-Hooks ist unbestätigt (ADR-Frage).
20. **Property-Tests für den Parser** (fuzz gegen zufällige Shell-Strings) — der Parser ist
    sicherheitskritisch; Beispieltests decken nicht alle Umgehungen.
21. **preToolUse-Latenz-Benchmark:** das 2000-ms-Budget muss unter realer Last (kaltes vs.
    warmes Binary, ReadyToRun) gemessen werden; sonst drohen fail-closed-Denys durch Timeout.
22. **Coverage-Ziel** definieren und in CI erzwingen.

### F — Distribution & Onboarding
23. **Versionierung/Releases:** SemVer je Extension, Changelog, Git-Tags; `/extensions info`
    zeigt Version.
24. **Setup-Assistent:** `/mode remote` das erste Mal → geführte PAT/Token-Einrichtung statt
    nur Fehlermeldung.
25. **prices.json-Pflege:** Preis-Stand veraltet schnell; Hinweis bei altem `updated`-Datum,
    optionaler Abgleich.
26. **Nutzer-Doku:** knappe „Getting Started" + Troubleshooting (nicht nur ADR/Plan).

### G — Konsolidierung (Aufräumen nach Dogfooding)
27. **Doppel-Guarding entfernen:** die `hooks.json`-tool-guardian/git-guardrails des
    Work-`general`-Plugins abbauen, sobald die Extension bewiesen strenger ist (Deny-Parität
    ist getestet — der PR fehlt noch).
28. **anonymizer-proxy-Pfad** für Nutzer der Extension entbehrlich machen/dokumentieren.

---

## 3. Was die Umsetzung *anheben* würde (über „produktiv" hinaus)

- **Natives SDK-Connect-back (ForUri) statt Stecker:** eliminiert die Bridge-Ebene, halbiert
  die Latenz, entfernt eine ganze Fehlerklasse — der größte Architektur-Hebel (v3).
- **Fleet-Integration:** `/batch run --fleet` mit Custom-Agent-Personas + Kosten-Attribution
  je Subagent über `subagent.*`-Events (v2). Macht aus dem Batch echten Parallelismus.
- **OTLP-Telemetrie + Dashboard:** `usage.jsonl` nach OpenTelemetry exportieren; Grafana-Sicht
  auf Kosten/Modelle/Denies über Zeit statt nur Ad-hoc-`/flightlog`.
- **Statistik-gestützte Budgets:** aus dem Recorder lernen, typische Turn-/Tool-Zahlen je
  Workflow-Typ vorschlagen, statt fixer Defaults.
- **Self-Healing/Adaptive Policy:** Wiederholungs-Denys → automatisch alternativen Weg
  vorschlagen; Loop erkennt „gleiche Datei dreht sich" schon (Hash) — ausbauen zu „schlage
  Strategie-Wechsel vor".
- **Embedding-basierte Kontext-Injektion:** SystemMessage-Sections thematisch schneiden, damit
  das CLI-Retrieval nur Relevantes lädt (Plan §0.3 angelegt, real ungenutzt).
- **Home-Variante** `mkc-home-*` (warn-Modus, GitHub statt ADO) als zweite Welt.

---

## 4. Priorisierte Roadmap

**Must (Blocker für Produktiv-Go):** A1–A3 (E2E + Capability + Drift), B4 (Tool-Fassade),
C8–C9 (Schema-Version + Concurrency), D13–D15 (PII-Quelle, Secret-Recall, Keychain),
E18 (Windows-CI), E21 (Latenz-Benchmark), G27 (Doppel-Guard-Abbau).

**Should (kurz nach Go):** B5–B7 (Loop/Batch-Antrieb, Simplify, Sync-Konflikt), C10–C12
(Logging, Locale, Degradation-Tests), E19–E20 (Aggregation real, Parser-Fuzz), F23–F26.

**Could (Anhebung):** §3 komplett (ForUri, Fleet, OTLP, adaptive Budgets, Home-Variante).

---

## 5. Definition of Production-Ready (Exit-Kriterien)

1. E2E-Suite gegen echte `copilot`-CLI grün (Linux **und** Windows).
2. Capability-Abgleich dokumentiert; Payload-Normalizer gegen reale Felder fixiert.
3. Tool-Fassade vollständig; Moduswechsel local↔remote ohne Kontext-Bruch nachgewiesen.
4. State-Schema versioniert + Concurrency-sicher (paralleler Session-Test grün).
5. Secret-Scanner-False-Negative-Rate gemessen; PII-Namensquelle gepflegt; Token via Keychain.
6. preToolUse-p99-Latenz < Budget unter Last belegt.
7. `hooks.json`-Doppel-Guards entfernt; ein Guard-System produktiv.
8. Versioniert, Changelog, Getting-Started-Doku; Setup-Assistent für Remote.
