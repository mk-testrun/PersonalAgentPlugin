---
name: onboarding-checklist
description: Nutze um den Onboarding-Fortschritt zu tracken und anzuzeigen.
---

## Checklistenpunkte

- [ ] env-doctor grün
- [ ] repo-orientation abgeschlossen
- [ ] codebase-tour abgeschlossen
- [ ] erste Aufgabe gewählt (first-task-pick)
- [ ] erster Commit auf Feature-Branch
- [ ] erster PR geöffnet
- [ ] Confluence-Architektur verstanden (confluence-explain)

## Persistenz

Fortschritt in `state/onboarding.json` speichern. Bei `sessionStart` prüfen ob JSON fehlt → einmaligen Nudge ausgeben (nicht blockierend).
