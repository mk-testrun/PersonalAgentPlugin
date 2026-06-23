---
name: dotnet-conventions
description: Nutze proaktiv beim Schreiben von C#-Code und .csproj-Dateien.
applyTo: ["**/*.cs", "**/*.csproj"]
---

## Regeln

1. **Nullable:** `#nullable enable` / Projekt-Setting, keine `?`-Unterdrückung ohne Begründung
2. **async/await:** kein `.Result`/`.Wait()` — konsequent async bis zum Top
3. **DI:** Constructor Injection, nie `ServiceLocator`
4. **Records:** für DTOs und Value Objects bevorzugen
5. **LINQ:** bevorzuge `IQueryable` für DB-Queries (EF-Core), `IEnumerable` für In-Memory
6. **Logging:** `ILogger<T>`, kein `Console.Write`
7. **Keine Magic-Strings:** Konstanten, nameof(), CallerMemberName
