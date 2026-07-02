---
name: workflow-router
description: >-
  Nutze wenn ein mehrstufiger Workflow orchestriert werden soll (Feature, Bugfix, Review-Flow, Ship,
  Plan) oder wenn ein unterbrochener Orchestrator-Lauf fortgesetzt wird. Erkennt aus dem Wunsch den
  passenden Workflow, fährt die in scripts/run-state.mjs fest kodierte Schritt-Choreografie
  (deterministisch, kein Improvisieren), delegiert jeden Schritt an das zuständige Plugin (general/
  blazor/testing/review/doku) und hält an [CONFIRM]/[GATE]-Punkten. Zustand wird persistiert → resume.
---

# workflow-router

Der Orchestrator-Kern: **welcher Workflow**, **welcher Schritt als Nächstes**, **wer macht ihn** — aus
einer deterministischen Quelle statt aus improvisiertem Prompt. Der Agent delegiert nur; die Schritte
kommen aus `scripts/run-state.mjs`.

## When to Use This Skill

- „Bau Feature X" / „Fix Bug Y" / „Review den Branch" / „Ship den PR" / „Plan das Vorhaben"
- „Setz den abgebrochenen Orchestrator-Lauf fort" (resume)

## Routing (Intent → Workflow)

| Wunsch | Workflow |
|---|---|
| neues Feature aus Issue/Anforderung | `feature` |
| Fehler reproduzieren + beheben | `bugfix` |
| nur prüfen (kein Code) | `review-flow` |
| merge-bereiten PR ausliefern | `ship` |
| größeres Vorhaben zerlegen (kein Code) | `plan` |

Kein passender Workflow → **nicht raten**; Rückfrage stellen.

## Workflow (deterministisch)

### 1 — Dry-run + State anlegen
```bash
node scripts/run-state.mjs init --workflow <name> --title "<kurz>"
```
Gibt den **vollständigen Schrittplan** (mit [CONFIRM]/[GATE]) + eine `run-Id` + den State-Pfad aus.
Diesen Plan dem Nutzer zeigen, bevor Schritt 1 läuft (§2.8).

### 2 — Schritt für Schritt
```bash
node scripts/run-state.mjs resume "<state-file>"   # nächster Schritt: Titel + Delegat + Gate
```
- Steht **[CONFIRM]** an → erst Ja/Nein einholen, dann ausführen.
- Steht **[GATE]** an → Delegat ausführen; bei `critical`/`high` **hart stoppen** (nicht advancen).
- Schritt an das genannte Plugin delegieren (siehe Delegations-Matrix in `reference.md`).
- Danach:
```bash
node scripts/run-state.mjs advance "<state-file>" --status done   # oder blocked / skipped, --note "…"
```

### 3 — Wiederaufnahme
Nach Absturz/Pause: `resume "<state-file>"` liest den nächsten offenen Schritt. Nichts wird doppelt
ausgeführt, weil der State erledigte Schritte kennt.

## Delegations-Matrix (Kurz)

`general` (ADO/Git/PR) · `blazor` (Code/EF) · `testing` (Tests/Coverage/E2E) · `review` (Gates) ·
`doku` (Doku/ADR) · `experimental` (loop, ADR-Record). Details + alle Schritt-Listen: `reference.md`.
Durchgespielter Lauf (init→resume→advance→Gate→resume): [`examples.md`](examples.md).

## Output

- State-Datei `state/artifacts/orchestrator-<workflow>-<runId>.json` (Fortschritt, resumebar)
- Delegierte Ergebnisse der Plugins; bei [GATE]-Treffer: Abbruch mit Begründung
- Der Router **implementiert nichts selbst** — er routet, delegiert, hält Gates.
