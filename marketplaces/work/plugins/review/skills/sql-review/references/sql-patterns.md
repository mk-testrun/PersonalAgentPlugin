# SQL / EF-Core Review Patterns

Each: ruleId · what to look for · example (bad → good) · severity.

## SQL-INJECT *(critical)*
String-built SQL or `FromSqlRaw`/`ExecuteSqlRaw` with user input.
```csharp
db.Orders.FromSqlRaw($"SELECT * FROM Orders WHERE Customer = '{name}'");   // bad
db.Orders.FromSqlInterpolated($"SELECT * FROM Orders WHERE Customer = {name}"); // good (parameterized)
```

## SQL-PARAM *(critical)*
Dynamic SQL without an allowlist. Column/table names can't be parameters → validate against a fixed allowlist.

## SQL-NPLUS1 *(high)*
Query inside a loop / lazy navigation per row.
```csharp
foreach (var o in db.Orders) use(o.Customer.Name);          // bad: N+1
db.Orders.Include(o => o.Customer)...                        // good
db.Orders.Select(o => new { o.Id, o.Customer.Name })...      // better (projection)
```

## SQL-INDEX *(medium)*
Filter/join/sort columns unindexed; function on indexed column defeats the index.
```sql
WHERE LOWER(Email) = @e      -- bad: non-sargable
WHERE Email = @e             -- good (store normalized) + index on Email
```

## SQL-SELECTSTAR *(medium)*
`SELECT *` / loading whole entity when few fields are needed → project to a DTO.

## SQL-TXN *(high)*
Transaction boundaries; isolation level chosen consciously; no long transactions spanning user interaction.

## SQL-MIGRATE *(high)*
Migration must be reversible (`Down`); destructive steps (DROP, NOT NULL without default) need a backfill plan;
prefer idempotent scripts. See `blazor/efcore-migration-*`.

## SQL-NULL *(medium)*
`= NULL` never matches → use `IS NULL`; three-valued logic in `WHERE`/`NOT IN` with nullable columns.

## SQL-PAGING *(medium)*
Unbounded `ToList()` on large tables → `OrderBy(stableKey).Skip(n).Take(m)`.

## Severity guidance
Injection/parametrization = critical. N+1/transaction/migration-safety = high. Index/projection/paging/null = medium.
