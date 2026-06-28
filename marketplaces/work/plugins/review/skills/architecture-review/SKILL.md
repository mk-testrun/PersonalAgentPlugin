---
name: architecture-review
description: Nutze für Schicht-, Abhängigkeits- und Design-Prüfung auf Modulebene (inkl. .NET-spezifischer Muster, via sharplens).
---

## Scope

Struktur statt Detail: Schichtung, Abhängigkeitsrichtung, Kopplung, Modulgrenzen —
**plus** .NET-/Blazor-spezifische Design-Muster. Allgemeine Code-Qualität → code-review.

## Checkliste — Architektur

1. **ARCH-LAYER** — Abhängigkeiten zeigen nach innen (Domain ↛ Infrastructure/UI); keine Schicht-Umgehung. *(high)*
2. **ARCH-CYCLE** — Keine Projekt-/Namespace-Zyklen (sharplens-Abhängigkeitsgraph). *(high)*
3. **ARCH-COUPLING** — Hohe Fan-out-Module entkoppeln (Interfaces/Events); kein Big-Ball-of-Mud. *(medium)*
4. **ARCH-COHESION** — Fachlich Zusammengehöriges in einem Modul; keine „Utils"-Sammelhalden. *(low)*
5. **ARCH-BOUNDARY** — Domänenlogik nicht in Controllern/Components; klare Anwendungsschicht. *(medium)*
6. **ARCH-LEAK** — Persistenz-/Framework-Typen (EF-Entities, `DbContext`) nicht über Schichtgrenzen lecken. *(medium)*

## Checkliste — .NET-Design *(ehem. dotnet-design-review)*

7. **NET-DI** — Korrekte Service-Lifetimes (Singleton/Scoped/Transient); kein Captive-Dependency (Scoped in Singleton). *(high)*
8. **NET-ASYNC** — `async` durchgängig; kein `.Result`/`.Wait()`; `CancellationToken` durchgereicht. *(high)*
9. **NET-DISPOSE** — `IDisposable`/`IAsyncDisposable` korrekt; `using`/`await using` für Ressourcen. *(medium)*
10. **NET-NULLABLE** — Nullable-Kontext aktiviert und respektiert; keine `!`-Unterdrückung ohne Grund. *(low)*
11. **NET-API** — Öffentliche Typen konsistent (Immutability wo sinnvoll, `sealed` als Default, records für DTOs). *(low)*

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `ARCH-*`/`NET-*`. Bei `critical`/`high`: **[GATE]**.
