---
name: test-conventions
description: Nutze proaktiv beim Schreiben von Tests für .NET-Projekte.
applyTo: ["**/*Tests.cs", "**/*Test.cs", "**/Tests/**"]
---

## Stack

xUnit, FluentAssertions, NSubstitute, bUnit (Blazor), Testcontainers (Integration)

## Regeln

1. **AAA-Pattern:** Arrange / Act / Assert — klar getrennt mit Kommentarblöcken
2. **Keine Sleep/Delay:** `TimeProvider`-Abstraktion nutzen
3. **bUnit-Komponententests:** `RenderComponent<T>`, `FindComponent`, `WaitForState`
4. **Mock-Strategie:** NSubstitute `.Returns()`, kein Partial-Mocking ohne Begründung
5. **Test-Namen:** `MethodName_StateUnderTest_ExpectedBehavior`
