---
name: tests-review
description: Nutze wenn Test-Code auf Smells und Qualitätsprobleme geprüft werden soll.
---

## Test-Smells (→ findings[])

- Magic Numbers ohne Kommentar
- Mehrere Acts in einem Test
- Assertions ohne FluentAssertions (rohe Assert.True)
- Shared mutable state zwischen Tests
- Tests ohne Arrange-Trennung
- `Thread.Sleep` / `Task.Delay`

Ergebnis als `findings[]` (severity: low/medium, area: tests).
