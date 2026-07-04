---
description: Issue → Feature-Branch → Implementierung → Tests → Review → PR. Mit Dry-run und [CONFIRM] je Schritt.
---

Treiber: **`workflow-router`**-Skill — `node scripts/run-state.mjs init --workflow feature` erzeugt den
Dry-run-Plan + resumebaren State; `resume`/`advance` fahren die Schritte. Die Choreografie ist im Skript
kodiert (kein Improvisieren). Die folgende Liste spiegelt sie:

1. Issue auflösen (read-only) — **[CONFIRM]** „Issue #X als Feature bestätigen?"
2. Idempotenz-Check (Branch existiert?) → Branch `feature/AB-<id>-<slug>` — **[CONFIRM]**
3. Implementierung via blazor — **[CONFIRM]** bei destruktiven Änderungen
4. Tests via testing/dotnet-test-run — rot? **[CONFIRM]** weitermachen?
5. (opt-in) E2E via testing/e2e-playwright (localhost) — rot? **[GATE]**
6. Review via review (diff-gescopt) — critical/high? **[GATE]**
7. PR öffnen + Work-Item verlinken — **[CONFIRM]**
8. Doku-Hinweis (optional **[CONFIRM]** ADR/README via doku)
9. Run-Log schreiben. Bei Abbruch nach Schritt 2: **[CONFIRM]** Branch löschen?

Wiedereinstieg nach Unterbrechung: `node scripts/run-state.mjs resume <state-file>` — offene Runs zeigt `list`, abgeschlossene räumt `prune` auf.
