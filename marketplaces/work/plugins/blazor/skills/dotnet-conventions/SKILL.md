---
name: dotnet-conventions
description: >-
  Nutze proaktiv beim Schreiben von C#-Code und .csproj-Dateien: erzwingt nullable-enable ohne unbegründete
  Unterdrückung, konsequentes async/await (kein .Result/.Wait()), Dependency-Injection statt Statik und
  moderne Language-Features. Regel-Skill — nennt je Verstoß die idiomatische .NET-Alternative.
---

## Regeln

1. **Nullable:** `#nullable enable` / Projekt-Setting, keine `?`-Unterdrückung ohne Begründung
2. **async/await:** kein `.Result`/`.Wait()` — konsequent async bis zum Top
3. **DI:** Constructor Injection, nie `ServiceLocator`
4. **Records:** für DTOs und Value Objects bevorzugen
5. **LINQ:** bevorzuge `IQueryable` für DB-Queries (EF-Core), `IEnumerable` für In-Memory
6. **Logging:** `ILogger<T>`, kein `Console.Write`
7. **Keine Magic-Strings:** Konstanten, nameof(), CallerMemberName
