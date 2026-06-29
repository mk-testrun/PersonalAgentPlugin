---
name: dotnet-conventions
description: Nutze proaktiv beim Schreiben von C#-Code in privaten .NET-Projekten.
applyTo: ["**/*.cs", "**/*.csproj"]
---

## Scope

C#/.NET-Konventionen für private Projekte — pragmatisch (weniger Dokumentationszwang als im Profi-Umfeld),
aber technisch sauber.

## Regeln

1. **Nullable:** `#nullable enable`; keine `!`-Unterdrückung ohne Grund.
2. **async/await:** durchgängig async; kein `.Result`/`.Wait()`.
3. **DI:** Constructor Injection statt ServiceLocator/statischem Zustand.
4. **Records:** für DTOs/Value Objects bevorzugen; Immutability wo sinnvoll.
5. **LINQ:** `IQueryable` für DB-Queries, `IEnumerable` für In-Memory; keine Mehrfach-Enumeration.
6. **Logging:** `ILogger<T>` statt `Console.Write`.
7. **Konstanten:** keine Magic-Strings/-Numbers; `nameof()` nutzen.

## Output

Proaktive Hinweise/Vorschläge beim Editieren von C#-Dateien; keine erzwungenen XML-Doc-Comments im Hobby-Kontext.
