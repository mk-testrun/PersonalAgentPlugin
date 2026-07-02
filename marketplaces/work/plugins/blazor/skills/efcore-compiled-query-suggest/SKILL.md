---
name: efcore-compiled-query-suggest
description: >-
  Nutze um wiederkehrende Hot-Path-EF-Core-Queries zu identifizieren, die von EF.CompileAsyncQuery profitieren
  (sparen den Expression-Tree-Aufbau pro Aufruf). Liefert Kandidaten + Vorher/Nachher-Snippet.
  Query-Übersetzung selbst → efcore-query-explain; Indizes → efcore-index-suggest.
---

## Scope

Wiederkehrende Hot-Path-Queries finden, die von vorkompilierten Queries profitieren (sparen
Expression-Tree-Aufbau pro Aufruf). Index/SQL → efcore-index-suggest/efcore-query-explain.

## Kandidaten-Kriterien

1. **EFC-HOT** — Query wird sehr häufig ausgeführt (Request-Pfad, Schleife, Polling). *(Kandidat)*
2. **EFC-STABLE** — Form ist stabil, nur Parameter ändern sich (kein dynamischer Query-Aufbau). *(Voraussetzung)*
3. **EFC-SIMPLE** — Keine query-zeitabhängige Struktur (kein bedingtes `Include`/`Where` je nach Flag). *(Voraussetzung)*

Dynamische/seltene Queries sind **keine** Kandidaten — dort lohnt der Aufwand nicht.

## Vorher/Nachher

```csharp
// vorher: Expression-Tree wird bei jedem Aufruf neu gebaut
var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

// nachher: einmal kompiliert, danach wiederverwendet
private static readonly Func<AppDbContext, int, CancellationToken, Task<User?>> _byId =
    EF.CompileAsyncQuery((AppDbContext db, int id, CancellationToken ct) =>
        db.Users.FirstOrDefault(u => u.Id == id));
var user = await _byId(db, id, ct);
```

## Output

Liste der Kandidaten mit Begründung (Häufigkeit/Stabilität) + konkretes Compiled-Query-Snippet.
Keine DB-Änderung; reine Code-Empfehlung. Messung empfehlen (Benchmark) bevor breit ausgerollt wird.
