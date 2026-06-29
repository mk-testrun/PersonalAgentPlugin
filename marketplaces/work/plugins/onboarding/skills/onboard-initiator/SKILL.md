---
name: onboard-initiator
description: Nutze als Einstieg ins Onboarding — erkennt Host & Rolle, zeigt ein Menü der Bereiche und führt gezielt in genau einen Track.
---

Der Initiator nimmt den Nutzer an die Hand, **ohne** ihn mit Fragen zu überladen:
ein kompaktes Setup, dann ein Menü — der Nutzer wählt **einen** Bereich, nur der wird abgearbeitet.

## Schritt 1 — Profil (einmalig, max. 2 Fragen)

1. **Host erkennen** → Skill `host-detect` (erkennt Copilot CLI / VS Code / Visual Studio, bestätigt).
2. **Rolle & Tiefe** kompakt erfragen und in `state/onboarding.json` speichern:
   - **Publikum:** `programmierer` | `nicht-programmierer`
   - **Tiefe:** `eli5` | `grob` | `detailliert`

Liegt `state/onboarding.json` bereits vor → Profil übernehmen, nicht erneut fragen (nur „noch aktuell?").

## Schritt 2 — Menü (Bereiche anbieten, nicht alle ausführen)

Zeige knapp die drei Tracks und frage, **womit** der Nutzer starten will:

| Track | Skill | Beantwortet |
|---|---|---|
| 🛠️ Tool/Host | `tool-onboarding` | „Wie funktioniert mein Programm (CLI/VS Code/VS) mit Copilot?" |
| 🧩 Marketplace | `marketplace-onboarding` | „Was kann dieser Marketplace, welche Plugins, wie nutze/installiere ich sie?" |
| 📂 Projekt | `project-onboarding` | „Wie ist dieses Projekt aufgebaut, wo fange ich an?" |

## Schritt 3 — Delegieren & tracken

- Nur den gewählten Track-Skill ausführen; danach zurück ins Menü oder beenden.
- Fortschritt in `state/onboarding.json` aktualisieren (welche Tracks/Schritte erledigt) — siehe `onboarding-checklist`.
- Optional Vorab-Check: `env-doctor`, wenn der Nutzer Einrichtungsprobleme vermutet.

## Rollen-Adaptivität (gilt für alle Tracks)

| Profil | Stil |
|---|---|
| `nicht-programmierer` + `eli5` | Alltagsanalogien, kein Fachjargon, „Was bringt mir das?" |
| `nicht-programmierer` + `grob` | Zweck & Abläufe, wenige Begriffe erklärt |
| `programmierer` + `grob` | Stichpunkte, Befehle, wenig Prosa |
| `programmierer` + `detailliert` | Architektur, Patterns, Trade-offs, Quellen |

Nie überladen: erst Überblick, dann auf Nachfrage tiefer. Immer fragen „mehr Details oder weiter?".
