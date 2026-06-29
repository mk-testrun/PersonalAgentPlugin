---
name: tdd-loop
description: Nutze wenn du strikte Test-Driven-Development-Zyklen erzwingen willst — erst roter Test, dann Implementierung bis grün, dann Refactor. Nutzt testing/dotnet-test-run.
---

Erzwinge den Red-Green-Refactor-Zyklus:

**Phase 1 — RED (Fehlschlagender Test):**
1. Schreibe zuerst einen Unit-Test der exakt das gewünschte Verhalten beschreibt
2. Test muss fehlschlagen (verifiziere mit `dotnet test`)
3. Kein Produktionscode solange der Test noch nicht existiert

**Phase 2 — GREEN (Minimum zum Bestehen):**
4. Schreibe den minimalsten Produktionscode um den Test grün zu machen
5. Keine Optimierung, kein Overengineering — nur bestehen
6. Verifiziere: alle Tests grün (`dotnet test`)

**Phase 3 — REFACTOR:**
7. Verbessere Code-Qualität ohne das Verhalten zu ändern
8. Extrahiere Abstraktionen nur wenn nötig
9. Tests müssen weiterhin grün bleiben
10. [CONFIRM] vor größeren Strukturänderungen

**Iterationsprotokoll:**
```
Iteration N:
  RED:    [Testname] → FAILED ✓ (expected)
  GREEN:  [Testname] → PASSED ✓
  STATUS: [Anzahl] Tests grün / [Anzahl] Tests gesamt
```

**Konventionen:**
- xUnit (Fact/Theory/InlineData)
- bUnit für Blazor-Komponenten
- Arrange-Act-Assert Struktur
- Test-Klassen in `Tests/`-Projekt
- Keine `Thread.Sleep` — immer async/await
