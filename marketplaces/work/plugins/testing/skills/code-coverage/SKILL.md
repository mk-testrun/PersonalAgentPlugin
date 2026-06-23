---
name: code-coverage
description: Nutze wenn Coverage gemessen und Gate-Ergebnisse geprüft werden sollen.
---

## Tools

- coverlet (über `dotnet test --collect:"XPlat Code Coverage"`)
- reportgenerator

## Gates

- Domain-Layer: ≥ 80% Branch-Coverage
- Gesamt: ≥ 70% Branch-Coverage

## Schritte

1. Coverage mit coverlet messen
2. HTML-Report mit reportgenerator erzeugen
3. Gate-Prüfung: Unterschreitung → **[GATE]**
4. Report-Pfad ausgeben
