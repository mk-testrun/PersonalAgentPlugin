---
name: dotnet-test-run
description: >-
  Nutze wenn .NET-Tests ausgeführt, Fehler analysiert oder Fix-Vorschläge gemacht werden sollen: führt `dotnet
  test --filter` aus, identifiziert fehlgeschlagene Tests, analysiert den Stack-Trace, benennt die Root-Cause
  und liefert einen konkreten Fix mit Code-Snippet, dann Re-Run. Basis für tdd-loop.
---

## Schritte

1. `dotnet test --filter <filter>` ausführen
2. Fehlgeschlagene Tests identifizieren
3. Stack-Trace analysieren, Root-Cause benennen
4. Konkreten Fix-Vorschlag mit Code-Snippet
5. Nach Fix: Tests erneut ausführen

## Fix-Loop — Abbruchbedingung

Wiederhole Schritt 1–5 **maximal 3 Runden**. Stop, sobald eine zutrifft:

- ✅ Alle Tests grün.
- 🔁 Zwei Runden ohne Reduktion der Fehleranzahl → stop, Diagnose berichten.
- ❌ Fehler liegt außerhalb des Test-Scopes (Infrastruktur/Fixture/Umgebung) → eskalieren statt raten.
- 🛑 Runden-Limit erreicht → verbleibende Fehler + Hypothese auflisten.

Niemals Tests anpassen, nur damit sie grün werden (kein „Assertion abschwächen").
Für einen kontrollierten Mehr-Runden-Lauf: `loop`-Skill mit Erfolgskriterium „dotnet test grün".
