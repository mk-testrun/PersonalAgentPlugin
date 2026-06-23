---
name: dotnet-test-run
description: Nutze wenn .NET-Tests ausgeführt, Fehler analysiert oder Fix-Vorschläge gemacht werden sollen.
---

## Schritte

1. `dotnet test --filter <filter>` ausführen
2. Fehlgeschlagene Tests identifizieren
3. Stack-Trace analysieren, Root-Cause benennen
4. Konkreten Fix-Vorschlag mit Code-Snippet
5. Nach Fix: Tests erneut ausführen (Loop bis grün oder Abbruch)
