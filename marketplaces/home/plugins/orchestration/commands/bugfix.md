---
description: Repro → Failing Test → Fix → PR. Dry-run + [CONFIRM].
---
Treiber: **`workflow-router`** — `run-state.mjs init --workflow bugfix` (deterministisch, resumebar).
Repro [CONFIRM] → Fix → reviewer/review [GATE] → PR [CONFIRM].

Wiedereinstieg nach Unterbrechung: `node scripts/run-state.mjs resume <state-file>` — offene Runs zeigt `list`, abgeschlossene räumt `prune` auf.
