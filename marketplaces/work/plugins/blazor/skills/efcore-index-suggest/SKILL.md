---
name: efcore-index-suggest
description: Nutze um fehlende Datenbankindizes für EF-Core-Queries vorzuschlagen (FK, Filter-, Sort-, Join-Spalten).
---

## Scope

Index-Empfehlungen aus dem Query-/Modell-Code ableiten. Query-Übersetzung selbst → efcore-query-explain.
Empfehlungen werden als Fluent-API + Migration-Hinweis ausgegeben — **kein** direktes DB-Update.

## Kontext

- DbContext: `${env:EF_DBCONTEXT:-AppDbContext}` · Provider: `${env:DB_PROVIDER:-SqlServer}`

## Checkliste (→ Empfehlungen)

1. **EFI-FK** — Fremdschlüssel ohne Index (EF Core indiziert FK meist automatisch, Composite-FK aber prüfen). *(medium)*
2. **EFI-FILTER** — Häufig in `Where` gefilterte Spalten ohne Index. *(high)*
3. **EFI-SORT** — `OrderBy`-Spalten ohne Index (Sortier-Spill vermeiden). *(medium)*
4. **EFI-JOIN** — Join-Spalten beidseitig indiziert. *(medium)*
5. **EFI-COMPOSITE** — Composite-Index in der richtigen Spalten-Reihenfolge (Gleichheit vor Range, Selektivität zuerst). *(medium)*
6. **EFI-COVERING** — Hot-Query → Covering-Index mit `IncludeProperties` statt Key-Lookups. *(low)*
7. **EFI-OVERINDEX** — Redundante/überlappende Indizes auf Schreib-lastigen Tabellen markieren. *(low)*
8. **EFI-UNIQUE** — Fachliche Eindeutigkeit als `IsUnique()`-Index statt nur App-Validierung. *(medium)*

## Output

Je Empfehlung: Fluent-API-Snippet, z.B.
```csharp
modelBuilder.Entity<Order>()
    .HasIndex(o => new { o.CustomerId, o.CreatedUtc })
    .HasDatabaseName("IX_Order_Customer_Created");
```
plus Hinweis „danach `efcore-migration-add` ausführen". Keine direkte DB-Änderung.
