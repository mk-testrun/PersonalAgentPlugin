---
name: visual-explainer
description: Nutze um ein Konzept visuell zu erklären — wählt automatisch die passende Darstellungsform.
---

## Zweck

Ein Konzept/Ablauf verständlich machen, indem die **passende** Visualisierung gewählt und delegiert wird.

## Darstellungswahl

| Inhalt | Form → Skill |
|---|---|
| Ablauf/Entscheidung | Flowchart → `mermaid-diagram` |
| Interaktion über Zeit | Sequenz → `mermaid-diagram` |
| Zahlen/Vergleich | Chart → `chartjs-data` |
| Hierarchie/Themen | Mind-Map → `mind-map` |
| Zeitlicher Verlauf | Timeline → `timeline` |
| Schema/Skizze | SVG/Excalidraw → `svg-illustration`/`excalidraw-sketch` |

## Aufbau

1. Kernaussage in **einem** Satz festhalten.
2. Passende Form wählen (Tabelle oben) und an den Spezial-Skill delegieren.
3. Kurze Begleiterklärung (rollen-/kontextgerecht) zum Visual liefern.

## Render-Pattern (§2.7)

- **Rich:** das gewählte Visual (Webview).
- **Fallback:** Quelltext/Tabelle des Visuals + erklärender Text.

## Output

Visual-Artefakt (über den delegierten Skill) + 2–3 Sätze Erklärung.
