---
description: Reiner Review-Lauf — kein Write, kein Branch.
---
Treiber: **`workflow-router`** — `run-state.mjs init --workflow review-flow`.
reviewer/review: ganze Matrix → Aggregate → [GATE] bei critical/high. Output: MD/HTML.

Wiedereinstieg nach Unterbrechung: `node scripts/run-state.mjs resume <state-file>` — offene Runs zeigt `list`, abgeschlossene räumt `prune` auf.
