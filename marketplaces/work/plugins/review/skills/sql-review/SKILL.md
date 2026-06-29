---
name: sql-review
description: Nutze für SQL- und EF-Core-Migrations-Prüfung — Injection, Parametrisierung, N+1, Indizes, Transaktionen, Migrations-Safety.
applyTo: ["**/*.sql", "**/Migrations/**", "**/*DbContext*.cs"]
---

## Scope

SQL-Statements, EF-Core-Queries und Migrations. Allgemeine .NET-Performance → performance-review.

## Checkliste

1. **SQL-INJECT** — Keine String-Konkatenation in Queries; parametrisiert oder LINQ; kein `FromSqlRaw` mit Nutzerinput. *(critical)*
2. **SQL-PARAM** — Alle variablen Werte als Parameter; kein dynamisches SQL ohne Whitelist. *(critical)*
3. **SQL-NPLUS1** — Keine Query-in-Schleife; `Include`/Join/Projektion statt Lazy-Loading. *(high)*
4. **SQL-INDEX** — Filter-/Join-/Sort-Spalten indiziert; keine Funktion auf indizierter Spalte (`WHERE LOWER(x)`); keine impliziten Casts. *(medium)*
5. **SQL-SELECTSTAR** — Kein `SELECT *`/Voll-Entity wenn nur Felder gebraucht; Projektion auf DTO. *(medium)*
6. **SQL-TXN** — Transaktionsgrenzen korrekt; Isolation-Level bewusst; keine langen Transaktionen über Userinteraktion. *(high)*
7. **SQL-MIGRATE** — Migration reversibel (`Down`); keine destruktiven Schritte (Drop/NOT NULL ohne Default) ohne Plan; idempotent. *(high)*
8. **SQL-NULL** — NULL-Semantik beachtet (`= NULL` vs `IS NULL`); Three-Valued-Logic in Filtern. *(medium)*
9. **SQL-PAGING** — Große Resultsets paginiert (`Skip/Take` mit stabilem Sort); kein unbeschränktes `ToList()`. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: sql`, ruleId aus `SQL-*`. Bei `critical`/`high`: **[GATE]**.
