---
name: onboarding-checklist
description: >-
  Nutze um den Onboarding-Fortschritt zu tracken und anzuzeigen: liest/aktualisiert state/onboarding.json
  (Profil gesetzt, Track Tool/Host, Marketplace, Projekt) und zeigt die offene/erledigte Checkliste. Steuert,
  welcher Track als Nächstes sinnvoll ist.
---

## Checklistenpunkte

- [ ] Profil gesetzt (Host + Rolle/Tiefe in state/onboarding.json)
- [ ] Track Tool/Host (tool-onboarding)
- [ ] Track Marketplace (marketplace-onboarding) — benötigte Plugins installiert & verifiziert
- [ ] Track Projekt: env-doctor grün
- [ ] Track Projekt: repo-orientation abgeschlossen
- [ ] Track Projekt: codebase-tour / Projekt-Überblick (rollenabhängig)
- [ ] Confluence-Architektur verstanden (confluence-explain, Work)
- [ ] erste Aufgabe gewählt (first-task-pick)
- [ ] erster Commit auf Feature-Branch
- [ ] erster PR geöffnet

Nicht jeder Punkt gilt für jede Rolle — Nicht-Programmierer überspringen Code-Schritte.

## Persistenz

Fortschritt in `state/onboarding.json` speichern. Bei `sessionStart` prüfen ob JSON fehlt → einmaligen Nudge ausgeben (nicht blockierend).
