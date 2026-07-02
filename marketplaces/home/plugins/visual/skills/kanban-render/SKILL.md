---
name: kanban-render
description: >-
  Nutze um Aufgaben als Kanban-HTML-Board mit Spalten/Karten (To-Do/Doing/Done) zu rendern: Single-File-HTML
  über die CDN-Allowlist, Output nach state/artifacts/ mit Fallback (§2.7).
---

## Zweck

Aufgaben nach Status visualisieren (To-Do / Doing / Done).

## Lib/CDN

Statisches HTML/CSS (Flexbox-Spalten) — keine externe Lib nötig; optional Drag via leichter CDN-Lib.

## Daten-Schema

```js
const columns = [
  { title: 'To Do',  cards: [{ title: 'Setup', tag: 'infra' }] },
  { title: 'Doing',  cards: [{ title: 'Feature X', assignee: 'me' }] },
  { title: 'Done',   cards: [{ title: 'Bug Y' }] }
];
```

## Aufbau

1. Aufgaben den Spalten zuordnen (Status → Spalte).
2. Karten mit Titel + optionalen Badges (Tag/Assignee/Priorität).
3. Flexbox-Layout, eine Spalte je Status, scrollbare Karten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Board (Webview).
- **Fallback:** Markdown-Liste je Spalte (`## Doing` + Aufzählung) + Pfad zum HTML.

## Output

`state/artifacts/kanban-<ts>.html`.
