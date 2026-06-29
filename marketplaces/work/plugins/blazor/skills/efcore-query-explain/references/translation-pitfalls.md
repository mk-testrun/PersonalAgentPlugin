# EF Core — Translation Pitfalls

## EFQ-CLIENTEVAL (high)
Expression can't translate to SQL → EF Core 3+ throws (or silently evaluates after fetching all rows).
Signal: calling a non-translatable C# method inside `Where`/`Select` (custom helpers, `.ToString()` on
complex types).
→ Move the logic into translatable expressions, or materialize intentionally with `AsEnumerable()` at
the right point.

## EFQ-CARTESIAN (medium)
Multiple collection `Include`s multiply rows (cartesian product) — slow + heavy.
```csharp
ctx.Orders.Include(o => o.Items).Include(o => o.Payments)   // explosion
ctx.Orders.Include(o => o.Items).Include(o => o.Payments).AsSplitQuery()  // fix
```

## EFQ-OVERFETCH (medium)
Loading whole entities when only a few fields are needed.
→ Project to a DTO: `.Select(o => new OrderDto { o.Id, o.Total })`.

## EFQ-TRACK (medium)
Read-only query without `AsNoTracking()` pays change-tracking cost.
→ Add `.AsNoTracking()` for queries whose results you won't update.

## EFQ-LATEMATERIALIZE (medium)
`ToList()`/`AsEnumerable()` before filtering/sorting pulls everything, then filters in memory.
→ Keep `Where`/`OrderBy`/`Skip`/`Take` on `IQueryable` so they run in SQL.

## EFQ-PAGING (medium)
Unbounded `ToList()` on large tables.
→ Page with `OrderBy(...).Skip(n).Take(m)` (stable sort key).
