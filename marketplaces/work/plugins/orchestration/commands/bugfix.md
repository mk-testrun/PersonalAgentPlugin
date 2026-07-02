---
description: Repro erfassen → Failing Test → Fix → PR. Mit Dry-run und [CONFIRM] je Schritt.
---

Treiber: **`workflow-router`** — `run-state.mjs init --workflow bugfix` (deterministisch, resumebar). Schritte:

1. Repro erfassen (read-only) — **[CONFIRM]** „Repro korrekt erfasst?"
2. Branch `bugfix/AB-<id>-<slug>` — **[CONFIRM]**
3. Failing Test via testing — **[CONFIRM]** „Test korrekt rot?"
4. Fix via blazor → Tests grün? (Loop)
5. Review via review — **[GATE]**
6. PR öffnen — **[CONFIRM]**. Run-Log.
