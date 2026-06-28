---
name: performance-review
description: Nutze für Performance-Prüfung — Allokationen, Async-Hotspots, N+1, Caching, Rendering. Sprachneutral.
---

## Scope

Statische Performance-Heuristiken, framework-neutral (Web/Backend/Frontend).

## Checkliste

1. **PERF-ALLOC** — Allokationen/Kopien in Hot-Paths & Schleifen vermeiden; effiziente String-Bildung. *(medium)*
2. **PERF-ASYNC** — Kein Blocking auf Async; Parallelisierung wo sinnvoll; keine sequentiellen Awaits in Schleifen. *(high)*
3. **PERF-NPLUS1** — Keine Query/Request-in-Schleife; Batch/Join/Eager-Load. *(high)*
4. **PERF-CACHE** — Teure idempotente Ergebnisse cachen; Invalidierung bedacht. *(medium)*
5. **PERF-ITER** — Keine Mehrfach-Iteration derselben Sequenz; Filter vor Materialisierung. *(medium)*
6. **PERF-RENDER** — Frontend: unnötige Re-Renders vermeiden; Listen mit stabilen Keys; große Listen virtualisieren. *(medium)*
7. **PERF-IO** — Batch statt Einzel-IO; Streaming für große Payloads; keine blockierenden Calls im Request-Pfad. *(medium)*
8. **PERF-ASSET** — Frontend-Assets: Bundlegröße, Lazy-Loading, Bildkompression. *(low)*

## Output

findings[] nach `docs/findings-schema.md`, `area: performance`, ruleId aus `PERF-*`. Bei `critical`/`high`: **[GATE]**.
