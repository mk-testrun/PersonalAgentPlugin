---
description: Reiner Review-Lauf — kein Write, kein Branch, kein PR.
---

Treiber: **`workflow-router`** — `run-state.mjs init --workflow review-flow`.
review/review-full: ganze Matrix → review-aggregate → MD/HTML.
Output-Wahl am Ende: (m) Markdown · (h) HTML · (b) beides.
Kein [CONFIRM]/[GATE] — nur Output.

Wiedereinstieg nach Unterbrechung: `node scripts/run-state.mjs resume <state-file>` — offene Runs zeigt `list`, abgeschlossene räumt `prune` auf.
