---
description: GitHub-Issue → Branch → Code → Review → PR. Dry-run + [CONFIRM].
---
Treiber: **`workflow-router`** — `run-state.mjs init --workflow feature` (deterministisch, resumebar).
Issue via general/github-issues → [CONFIRM] → Branch via git-flow-helper → [CONFIRM] → Code → reviewer/review [GATE] → PR via general/github-prs [CONFIRM] → Run-Log.

Wiedereinstieg nach Unterbrechung: `node scripts/run-state.mjs resume <state-file>` — offene Runs zeigt `list`, abgeschlossene räumt `prune` auf.
