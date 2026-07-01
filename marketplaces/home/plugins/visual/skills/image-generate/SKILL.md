---
name: image-generate
description: Nutze um ein Bild via Cloud-Bild-Generierung zu erzeugen (Home erlaubt Cloud — Tokens/Kosten beachten).
---

## Zweck

Fotorealistische/kreative Bilder, die sich nicht deterministisch als SVG/Diagramm bauen lassen.

## Wann statt Vektor

- **image-generate:** kreativ/fotorealistisch/stilisiert.
- Für Schemata/Icons/Diagramme → `svg-illustration`/`mermaid-diagram` (kein Token-/Kostenaufwand).

## Aufbau

1. **Prompt schärfen** — Motiv, Stil, Komposition, Seitenverhältnis; negative Aspekte ausschließen.
2. **Kosten bewusst** — Cloud-Bild-Gen kostet Tokens/Geld; vorab kurz bestätigen bei mehreren/großen Bildern.
3. **Generieren** via imagegen-MCP; Ergebnis nach `state/artifacts/` speichern.
4. **Iteration** — bei Bedarf Prompt verfeinern statt blind neu würfeln.

## Strikte Einschränkungen

- Keine Bilder zu Personen/sensiblen/realen Identitäten ohne klare Berechtigung.
- Keine PII im Prompt.

## Render-Pattern (§2.7)

- **Rich:** Bild inline (Webview) + Caption + Link.
- **Fallback:** Datei-Pfad + Caption.

## Output

`state/artifacts/image-<ts>.png` + Caption.
