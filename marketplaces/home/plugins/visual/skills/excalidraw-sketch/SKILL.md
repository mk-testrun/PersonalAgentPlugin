---
name: excalidraw-sketch
description: >-
  Nutze um eine hand-gezeichnet wirkende Skizze als Excalidraw-Szene zu erstellen: lockere
  Whiteboard-Diagramme für Brainstorm/Architektur-Skizzen, exportiert als .excalidraw/SVG nach
  state/artifacts/. Präzise, versionierbare Diagramme → mermaid-diagram.
---

## Zweck

Lockere, skizzenhafte Diagramme (Whiteboard-Stil) für Brainstorm/Architektur-Skizzen.

## Lib/CDN

Excalidraw-Szenenformat (`.excalidraw` JSON) bzw. `@excalidraw/excalidraw` zum Rendern (CDN-Allowlist).

## Szenen-Schema (Auszug)

```json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    { "type": "rectangle", "x": 100, "y": 100, "width": 160, "height": 60, "id": "a" },
    { "type": "text", "x": 120, "y": 120, "text": "Service", "fontSize": 20 },
    { "type": "arrow", "x": 260, "y": 130, "points": [[0,0],[120,0]] }
  ],
  "appState": { "viewBackgroundColor": "#ffffff" }
}
```

## Aufbau

1. Elemente platzieren (`rectangle`/`ellipse`/`text`/`arrow`), IDs stabil halten.
2. Verbindungen über `arrow` mit `points`; Beschriftung als `text`-Element.
3. Layout grob rastern (x/y in 20er-Schritten) für Lesbarkeit.

## Render-Pattern (§2.7)

- **Rich:** eingebetteter Excalidraw-Viewer (Webview).
- **Fallback:** `.excalidraw`-JSON + Pfad; optional SVG-Export.

## Output

`state/artifacts/sketch-<ts>.excalidraw` (+ optional HTML-Viewer).
