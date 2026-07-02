---
description: PR finalisieren — Review, Changelog, autocomplete(squash). Mit [CONFIRM] und [GATE].
---

Treiber: **`workflow-router`** — `run-state.mjs init --workflow ship` (deterministisch, resumebar). Schritte:

1. Review auf Diff via review — **[GATE]**
2. Changelog via general/changelog-generate → CHANGELOG.md-Diff — **[CONFIRM]** „Übernehmen?"
3. PR ready/autocomplete (squash) via general/ado-pull-requests — **[CONFIRM]** (die große). Run-Log.
