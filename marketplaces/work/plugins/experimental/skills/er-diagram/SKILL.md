---
name: er-diagram
description: Nutze um ein ER-Diagramm aus dem EF-Core-Model zu generieren.
---

## Zweck

Datenmodell (Entities + Beziehungen) als ER-Diagramm sichtbar machen.

## Quelle & Lib

- Entities/Relationen aus dem EF-Core-Model (`DbContext`, Entity-Konfigurationen) bzw. via sharplens.
- Rendering: Mermaid `erDiagram` (CDN-Allowlist).

## Schema (Mermaid erDiagram)

```
erDiagram
  CUSTOMER ||--o{ ORDER : platziert
  ORDER ||--|{ ORDER_ITEM : enthaelt
  CUSTOMER { int Id PK string Name }
```
Kardinalitäten: `||` (genau 1), `o{` (0..n), `|{` (1..n).

## Aufbau

1. Entities + Schlüssel (PK/FK) aus dem Model lesen.
2. Beziehungen samt Kardinalität und Pflicht/Optional ableiten.
3. Wichtige Attribute je Entity (nicht alle — Kernfelder) ergänzen.
4. Mermaid `erDiagram` erzeugen, in HTML-Template einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/er-<ts>.html` + Mermaid-Quelle.
