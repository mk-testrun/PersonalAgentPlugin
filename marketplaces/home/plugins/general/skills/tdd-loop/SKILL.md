---
name: tdd-loop
description: Nutze wenn du Test-Driven-Development erzwingen willst — erst roter Test, dann Implementierung bis grün, dann Refactor. Sprachagnostisch (Python/TypeScript/Go/C#).
---

Erzwinge den Red-Green-Refactor-Zyklus:

**Phase 1 — RED:**
1. Schreibe zuerst den Test der das gewünschte Verhalten beschreibt
2. Verifiziere: Test schlägt fehl (erwartet)
3. Kein Produktionscode vor dem Test

**Phase 2 — GREEN:**
4. Minimum-Implementierung um den Test grün zu machen
5. Kein Overengineering
6. Alle Tests grün

**Phase 3 — REFACTOR:**
7. Qualität verbessern ohne Verhalten zu ändern
8. Tests müssen grün bleiben

**Sprachspezifische Test-Tools:**
| Sprache | Framework | Run-Befehl |
|---|---|---|
| C# | xUnit/bUnit | `dotnet test` |
| Python | pytest | `pytest` |
| TypeScript | vitest/jest | `npm test` |
| Go | testing | `go test ./...` |

**Protokoll:**
```
Iteration N: RED → [Test] FAILED ✓ | GREEN → [Test] PASSED ✓ | STATUS: X/Y grün
```
