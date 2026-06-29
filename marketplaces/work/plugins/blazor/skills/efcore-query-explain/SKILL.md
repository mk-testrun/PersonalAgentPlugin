---
name: efcore-query-explain
description: Nutze um einen EF-Core-LINQ-Query auf SQL-Übersetzung, N+1-Risiken und Client-Evaluation zu analysieren.
---

## Scope

LINQ→SQL-Verhalten eines konkreten Queries verstehen und Performance-Fallen finden.
Index-Empfehlungen → efcore-index-suggest; Compiled-Queries → efcore-compiled-query-suggest.

## Kontext

- DbContext: `${env:EF_DBCONTEXT:-AppDbContext}` · Provider: `${env:DB_PROVIDER:-SqlServer}`
- Connection nur via `dotnet user-secrets` (nie im Klartext).

## Schritte

1. **SQL sichtbar machen** — `query.ToQueryString()` ausgeben (oder `LogTo`/`EnableSensitiveDataLogging` nur lokal).
2. **Übersetzbarkeit** — prüfen, ob der ganze Query serverseitig läuft; gebrochene Übersetzung → Client-Eval.
3. **N+1 erkennen** — Navigation-Zugriff in Schleifen / `foreach` ohne `Include`/Projektion → eine Query pro Zeile.
4. **Include-Explosion** — mehrere Collection-`Include` erzeugen kartesisches Produkt → `AsSplitQuery()` erwägen.
5. **Materialisierung** — `ToList()`/`AsEnumerable()` zu früh (Filter danach im Speicher) markieren.

## Checkliste (→ Befunde)

1. **EFQ-CLIENTEVAL** — Ausdruck nicht übersetzbar, läuft im Client (EF Core wirft bzw. lädt alles). *(high)*
2. **EFQ-NPLUS1** — Lazy-Loading / Navigation-Zugriff in Schleife statt `Include`/Projektion. *(high)*
3. **EFQ-CARTESIAN** — Mehrere Collection-Includes ohne `AsSplitQuery` → Zeilen-Explosion. *(medium)*
4. **EFQ-OVERFETCH** — Ganze Entity geladen, obwohl nur Felder gebraucht → `Select`-Projektion auf DTO. *(medium)*
5. **EFQ-TRACK** — Read-only-Query ohne `AsNoTracking()`. *(medium)*
6. **EFQ-LATEMATERIALIZE** — Filter/Sort nach `ToList()` im Speicher statt in SQL. *(medium)*

## Output

Befunde + erzeugtes SQL + konkretes Vorher/Nachher-Snippet. Keine Schema-/DB-Änderung (read-only).
