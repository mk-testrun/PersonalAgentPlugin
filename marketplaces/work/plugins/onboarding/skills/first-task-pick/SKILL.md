---
name: first-task-pick
description: >-
  Nutze um eine geeignete erste Aufgabe aus Azure DevOps für neue Teammitglieder zu finden: filtert nach Typ
  (Task/kleines Bug), keinen externen Abhängigkeiten und klarer Akzeptanz, und schlägt begründet 1–3
  Kandidaten vor. Läuft über den ADO-MCP (anonymisiert), read-only.
---

## Kriterien für eine gute erste Aufgabe

- Typ: Task oder kleines Bug-Item
- Keine externen Abhängigkeiten
- Nicht im Critical Path
- Gute Acceptance Criteria

## Schritte

1. ado-workitems: list-unassigned filtern nach obigen Kriterien
2. Top-3 Kandidaten mit Begründung präsentieren
3. Nach Auswahl: Branch-Name via git-flow-helper vorschlagen — **[CONFIRM]**
4. Kurzen Implementierungsplan als Kommentar zum Work-Item anfügen — **[CONFIRM]**
