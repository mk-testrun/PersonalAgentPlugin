# ADR-0009 — Orchestrator-Pattern (Router-Skill + kodierte Workflows + State)

## Status
Accepted · 2026-07-02 · Ersetzt: — · Ersetzt durch: —

## Kontext
Das `orchestration`-Plugin hatte 0 Skills / 5 Commands: die Workflow-Choreografie (Feature, Bugfix,
Review-Flow, Ship, Plan) lebte ausschließlich in den Command-Prompts + im Agent-Body. Das ist anfällig
für **Prompt-Drift** — jeder Lauf kann Schritte anders reihen, überspringen oder Gates missachten — und
ein abgebrochener Lauf lässt sich nicht sauber fortsetzen. VS Code hat dafür `handoffs`; Copilot CLI
(unsere First-Party) hat das **nicht**, also brauchen wir ein CLI-taugliches Muster.

## Optionen
- **A — Status quo (Prompt-only):** kein Extra-Code, aber Drift + nicht resumebar.
- **B — N Workflow-Skills, Schritte je Skill in Prosa:** bessere Discovery, aber die Schritte stehen
  weiter in Prosa → Drift bleibt, N-fach dupliziert.
- **C — Router-Skill + Schritte als Code + persistenter State:** ein `workflow-router`-Skill, dessen
  Schritt-Choreografie in `scripts/run-state.mjs` **kodiert** ist (die `WORKFLOWS`-Map). Der Agent liest
  Plan/„nächsten Schritt" aus dem Skript, delegiert, und schreibt Fortschritt in eine resumebare
  State-Datei.

## Entscheidung
**Option C.** Aufbau:
- **`workflow-router`-Skill** (Discovery + Anleitung): Intent→Workflow-Routing, Delegations-Matrix,
  Gate-Semantik. Beschreibung nennt alle Workflows → auffindbar.
- **`scripts/run-state.mjs`** (deterministischer Kern): `init` (Dry-run-Plan + State), `resume` (nächster
  offener Schritt + Delegat + Gate), `advance` (Schritt abschließen/blocken), `show`. Die Schritte sind
  **im Skript** — Single Source of Truth gegen Drift.
- **Commands** (`/feature` … `/plan`) bleiben dünne Einstiegspunkte, die den Router mit dem
  Workflow-Namen starten.
- **Agent** bleibt dünn: liest den State, delegiert an `general/blazor/testing/review/doku/experimental`,
  hält [CONFIRM]/[GATE]. Implementiert nie selbst.
- **State-Datei** `state/artifacts/orchestrator-<workflow>-<runId>.json` → `--resume` nach Absturz.

Warum ein Router-Skill statt N Workflow-Skills (Option B): Discovery liefern schon die Commands; die
Drift-Gefahr löst der **Code**, nicht die Skill-Anzahl. Ein Skill + ein Skript ist einfacher und hält
die Schritte an genau einer Stelle. Split in N Skills bleibt später möglich (die Schritt-Map ist bereits
pro-Workflow strukturiert).

## Konsequenzen
- **Positiv:** keine Drift (Schritte kodiert), resumebar, Gates deterministisch markiert, Agent bleibt
  dünn und delegiert sauber. Home + Work teilen das *Muster*, aber je eine eigene Kopie (Zwei-Welten,
  ADR-0001) — Home ohne `ship` (kein Deploy).
- **Kosten:** Änderungen an einem Workflow müssen im Skript gemacht (dann in `reference.md` gespiegelt)
  werden; die Prosa-Tabellen dürfen nicht auseinanderlaufen (reference.md weist explizit darauf hin).

## Offene Fragen
- Soll `run-state.mjs` auch die Delegations-**Ausführung** kapseln (z. B. Sub-Agent-Aufruf loggen), oder
  bleibt Ausführung ganz beim Agenten?
- Lohnt später doch der Split in N eigenständige Workflow-Skills (feinere Evals je Workflow)?
