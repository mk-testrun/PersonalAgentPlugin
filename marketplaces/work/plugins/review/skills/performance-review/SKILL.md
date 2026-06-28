---
name: performance-review
description: Nutze für Performance-Prüfung in .NET/Blazor — Allokationen, Async-Hotspots, Caching, EF-Core-Tracking.
---

## Scope

Statische Performance-Heuristiken im .NET/Blazor-Code. Datenbank-spezifisches (N+1, Indizes)
ergänzend in sql-review.

## Checkliste

1. **PERF-ALLOC** — Allokationen in Hot-Paths/Schleifen vermeiden; `StringBuilder` statt `+=`; `Span`/`ArrayPool` wo sinnvoll. *(medium)*
2. **PERF-ASYNC** — Kein Sync-over-Async (`.Result`/`.Wait()`); `ConfigureAwait(false)` in Libs; `ValueTask` für Hot-Paths. *(high)*
3. **PERF-EFTRACK** — Read-only-Queries mit `AsNoTracking()`; keine ungewollte Change-Tracking-Last. *(medium)*
4. **PERF-EFNPLUS1** — Keine N+1-Queries; `Include`/Projektion statt Lazy-Loading in Schleifen. *(high)*
5. **PERF-CACHE** — Teure/idempotente Berechnungen cachen (IMemoryCache/Output-Cache); Invalidierung bedacht. *(medium)*
6. **PERF-LINQ** — Keine Mehrfach-Enumeration von `IEnumerable`; `Any()` statt `Count()>0`; Filter vor Materialisierung. *(medium)*
7. **PERF-BLAZOR** — `@key` in Listen; unnötige Re-Renders vermeiden; `ShouldRender`/`StateHasChanged` gezielt; große Listen virtualisieren. *(medium)*
8. **PERF-IO** — Batch statt Einzel-IO; Streaming für große Payloads; keine blockierenden IO-Calls im Request-Pfad. *(medium)*
9. **PERF-DISPOSE** — Langlebige Ressourcen (HttpClient via Factory) korrekt wiederverwendet, nicht pro Call neu. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: performance`, ruleId aus `PERF-*`. Bei `critical`/`high`: **[GATE]**.
