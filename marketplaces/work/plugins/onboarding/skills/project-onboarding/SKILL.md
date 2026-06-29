---
name: project-onboarding
description: Nutze um den Nutzer in ein konkretes Projekt einzuführen — Struktur, Pakete, Konventionen, DevOps, Doku — rollen-adaptiv.
---

## Scope

Track „Projekt". Führt durch das aktuelle Repo/Projekt. Ruft bestehende Skills auf statt zu duplizieren;
passt Tiefe an `state/onboarding.json` an.

## Schritte

1. **Stack & Struktur** → `repo-orientation` (Stack, Build, Test, wichtigste Verzeichnisse).
2. **Architektur & Flows** → `codebase-tour` (Composition-Root, Datenfluss, Kernflows, Patterns) — **nur für `programmierer`** in `detailliert`; für `nicht-programmierer` stattdessen Zweck/Hauptabläufe in Alltagssprache.
3. **Wichtige Pakete** — zentrale Abhängigkeiten aus `*.csproj`/`package.json` nennen und ihren Zweck erklären.
4. **Projekt-Konventionen** — projektspezifische Besonderheiten (Branch-Naming, Code-Style, Ordnerkonventionen) aus `general`/`blazor`-Conventions und Repo-Configs ableiten.
5. **DevOps-Repo** — wo der Code liegt, Pipeline-Grundzüge, wie PRs laufen (ADO im Work-Kontext).
6. **Dokumentation** — vorhandene Doku finden; im Work-Kontext Architektur-Seiten via `confluence-explain` (read-only) erklären.
7. **Erster Schritt** — optional `first-task-pick` für eine gute Einstiegsaufgabe (mit [CONFIRM]).

## Rollen-Adaptivität

| Profil | Fokus |
|---|---|
| `programmierer` + `detailliert` | Architektur, Patterns, DI, Datenfluss, Trade-offs |
| `programmierer` + `grob` | Struktur, Build/Test-Befehle, wo was liegt |
| `nicht-programmierer` | Wozu dient das Projekt, welche Teile gibt es, typische Abläufe — ELI5 |

## Output

Verständliche Projekt-Einführung passend zur Rolle; Tour-Draft optional nach `docs/onboarding/tour.md` (**[CONFIRM]**).
Fortschritt in `state/onboarding.json`.
