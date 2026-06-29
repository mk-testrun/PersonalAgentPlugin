---
name: svg-illustration
description: Nutze um eine SVG-Illustration direkt als Vektor-Code zu erstellen (Icons, einfache Grafiken, Schemata).
---

## Zweck

Schlanke, skalierbare Vektorgrafik ohne Cloud-Bild-Gen — direkt als SVG-Code.

## Format

Reines SVG (`<svg viewBox="0 0 W H">…</svg>`). Primitive: `rect`, `circle`, `path`, `line`, `text`, `g`.

## Aufbau

1. `viewBox` + Koordinatensystem festlegen (z.B. `0 0 400 300`).
2. Elemente aufbauen (Formen, Pfade); Gruppen (`<g>`) für Wiederverwendung/Transform.
3. Stil über Attribute/`<style>` (fill/stroke); accessible `<title>`/`aria-label` ergänzen.
4. Kompakt halten (keine Riesen-Pfade), sinnvolle IDs.

## Wann was

- **svg-illustration:** klar definierte, geometrische/schematische Grafik (deterministisch).
- Für fotorealistische/kreative Bilder → `image-generate` (Cloud).

## Render-Pattern (§2.7)

- **Rich:** SVG inline (Webview).
- **Fallback:** SVG-Quelltext + Pfad zur Datei.

## Output

`state/artifacts/illustration-<ts>.svg`.
