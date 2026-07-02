---
name: workflow-router
description: >-
  Nutze wenn ein mehrstufiger GitHub-Workflow orchestriert werden soll (Feature, Bugfix, Review-Flow)
  oder ein unterbrochener Orchestrator-Lauf fortgesetzt wird. Erkennt aus dem Wunsch den Workflow, fährt
  die in scripts/run-state.mjs kodierte Schritt-Choreografie (deterministisch, kein Improvisieren),
  delegiert an general (GitHub/git) bzw. reviewer (Review-Matrix) und hält an [CONFIRM]/[GATE]. Zustand
  wird persistiert → resume. Kein /ship (Home deployt nicht).
---

# workflow-router (Home)

Orchestrator-Kern für den GitHub-Workflow: welcher Workflow, welcher Schritt als Nächstes, wer macht ihn
— aus `scripts/run-state.mjs` (kodiert), nicht aus improvisiertem Prompt. Warn-Regime, aber
force-push-main bleibt hart (ADR-0004).

## When to Use This Skill

- „Bau Feature X" · „Fix Bug Y" · „Review den Branch" · „Setz den Lauf fort" (resume)

## Routing (Intent → Workflow)

| Wunsch | Workflow |
|---|---|
| neues Feature aus Issue | `feature` |
| Fehler beheben | `bugfix` |
| nur prüfen (kein Code) | `review-flow` |

Kein passender Workflow → Rückfrage, nicht raten.

## Workflow

```bash
node scripts/run-state.mjs init --workflow <name> --title "<kurz>"   # Dry-run-Plan + State + run-Id
node scripts/run-state.mjs resume "<state-file>"                     # nächster Schritt + Delegat + Gate
node scripts/run-state.mjs advance "<state-file>" --status done      # oder blocked/skipped, --note "…"
```
- **[CONFIRM]** → erst Ja/Nein, dann ausführen. **[GATE]** → bei critical/high hart stoppen (nicht advancen).
- Delegieren: `general` (GitHub Issues/PRs/git, Conventions) · `reviewer` (Review-Matrix, findings[]).
- Nach Absturz: `resume` liest den nächsten offenen Schritt — nichts doppelt.

## Output

State-Datei `state/artifacts/orchestrator-<workflow>-<runId>.json` (resumebar) + delegierte Ergebnisse.
Der Router implementiert nichts selbst — er routet, delegiert, hält Gates.
