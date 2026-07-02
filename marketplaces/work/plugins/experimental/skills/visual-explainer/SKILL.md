---
name: visual-explainer
description: >-
  Nutze um einen technischen Sachverhalt visuell als Diagramm + Text zu erklären: wählt die passende Form
  (flow/sequence/ER/C4/chart), delegiert an das passende Render-Skill und erläutert kurz. Meta-Skill über den
  anderen experimental-Visuals; Output nach state/artifacts/.
---

## Zweck

Einen Sachverhalt verständlich machen: passende Visualisierung wählen, delegieren, kurz erläutern.

## Darstellungswahl

| Inhalt | Form → Skill |
|---|---|
| Ablauf/Entscheidung | Flowchart → `mermaid-diagram` |
| Interaktion über Zeit | Sequenz → `sequence-diagram` |
| Architektur | C4 → `architecture-diagram` |
| Datenmodell | ER → `er-diagram` |
| Zahlen/Vergleich | Chart → `chartjs-data` |
| Abhängigkeiten | Graph → `dependency-graph` |

## Aufbau

1. Kernaussage in **einem** Satz festhalten.
2. Passende Form wählen und an den Spezial-Skill delegieren.
3. Begleiterklärung (kontext-/zielgruppengerecht) zum Visual liefern.

## Render-Pattern (§2.7)

- **Rich:** das gewählte Visual (Webview).
- **Fallback:** Quelltext/Tabelle des Visuals + erklärender Text + Pfad zu `state/artifacts/`.

## Output

Visual-Artefakt (über delegierten Skill) + 2–3 Sätze Erklärung.
