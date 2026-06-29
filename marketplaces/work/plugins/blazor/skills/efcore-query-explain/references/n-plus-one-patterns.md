# EF Core — N+1 Patterns (EFQ-NPLUS1, high)

## The shape
One query loads parents; then a navigation is accessed per parent → one extra query per row.
```csharp
var orders = ctx.Orders.ToList();               // 1 query
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);         // +1 query EACH → N+1
```

## Detect
- Navigation property accessed inside a `foreach`/`Select`/Razor `@foreach` over a materialized list.
- Lazy loading enabled (`UseLazyLoadingProxies`) + navigation touched in a loop.
- Logs showing many near-identical parameterized `SELECT`s.

## Fix options
**Eager load** what you'll use:
```csharp
var orders = ctx.Orders.Include(o => o.Customer).ToList();   // 1 query (join)
```
**Project** only what you need (best for read paths):
```csharp
var rows = ctx.Orders.Select(o => new { o.Id, CustomerName = o.Customer.Name }).ToList();
```
**Split** when eager-loading many collections (avoid cartesian explosion): add `.AsSplitQuery()`.

## In Blazor
Don't trigger lazy loads during render. Load with `Include`/projection in the page's data method,
not in the component markup.
