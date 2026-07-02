---
name: mind-map
description: >-
  Nutze um eine Mind-Map aus einer Markdown-Gliederung mit Markmap zu erstellen: hierarchisches
  Brainstorming/Themen-Übersicht als aufklappbare Map. Single-File-HTML über die CDN-Allowlist, Output nach
  state/artifacts/ mit Fallback.
---

## Zweck

Hierarchisches Brainstorming/Themen-Übersicht als aufklappbare Mind-Map.

## Lib/CDN

`markmap-lib` + `markmap-view` (CDN-Allowlist) — rendert Markdown-Überschriften/Listen als Map.

## Daten-Schema

Reine Markdown-Hierarchie:
```markdown
# Thema
## Bereich A
- Punkt 1
- Punkt 2
## Bereich B
- Punkt 3
```
Verschachtelung = Map-Ebene. Wurzel = oberste Überschrift.

## Aufbau

1. Inhalte als saubere MD-Hierarchie strukturieren (eine Wurzel).
2. Ebenen flach halten (max. 3–4 tief) für Lesbarkeit.
3. In HTML-Template mit markmap-Autoloader einbetten.

## Render-Pattern (§2.7)

- **Rich:** interaktive Map (Webview).
- **Fallback:** die MD-Gliederung selbst (ist menschenlesbar) + Pfad zum HTML.

## Output

`state/artifacts/mindmap-<ts>.html` + die MD-Quelle.
