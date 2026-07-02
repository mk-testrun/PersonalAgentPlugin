---
name: efcore-entity-design-review
description: >-
  Nutze um ein EF-Core-Entity-/Model-Design auf Konventionen und Best Practices zu reviewen: Keys,
  Beziehungen, Nullability, Concurrency-Token, Mapping und Shadow-Properties. Liefert findings[] mit konkreter
  Fluent-API-Korrektur. Query-Performance → efcore-query-explain; Indizes → efcore-index-suggest.
---

## Scope

Modell-Design: Keys, Beziehungen, Nullability, Konkurrenz, Mapping, Shadow-Properties.
Query-Performance → efcore-query-explain; Indizes → efcore-index-suggest.

## Kontext

- DbContext: `${env:EF_DBCONTEXT:-AppDbContext}` · Provider: `${env:DB_PROVIDER:-SqlServer}`

## Checkliste (→ Befunde)

1. **EFD-KEY** — Jede Entity hat einen klaren Primary Key; Composite-Keys bewusst; keine `int`-Keys wo `Guid` nötig (Replikation). *(high)*
2. **EFD-CONCURRENCY** — Optimistic Concurrency via `[Timestamp]`/`rowversion` oder `IsConcurrencyToken()` bei editierbaren Entities. *(high)*
3. **EFD-RELATION** — Beziehungen explizit konfiguriert; Navigation + FK-Property vorhanden; Required vs Optional korrekt. *(medium)*
4. **EFD-DELETE** — `OnDelete`-Verhalten bewusst gesetzt (Cascade/Restrict/SetNull) statt Default. *(high)*
5. **EFD-NULLABLE** — Nullability des Modells passt zur DB (`required`/`?`); keine impliziten NULL-Spalten. *(medium)*
6. **EFD-CONVERT** — Value-Conversions/Enums sauber gemappt (kein magischer `int`); Money als `decimal(p,s)`. *(medium)*
7. **EFD-OWNED** — Value Objects als Owned Types statt eigener Tabelle, wo sinnvoll. *(low)*
8. **EFD-SHADOW** *(aus Merge)* — Shadow-Properties bewusst (z.B. FK, `CreatedUtc`) — nicht versehentlich entstanden; kritische Felder als echte Properties sichtbar machen. *(medium)*
9. **EFD-PERSISTENCE-LEAK** — Keine reinen Persistenz-Attribute/`DbContext`-Abhängigkeit in Domain-Entities (Trennung Domäne/Mapping). *(medium)*
10. **EFD-STRINGLEN** — `string`-Spalten mit `HasMaxLength` statt unbounded `nvarchar(max)`. *(low)*

## Output

Befunde nach Schwere + Fluent-API-/Annotation-Vorschlag je Fund. Read-only (keine Migration/DB-Änderung).
