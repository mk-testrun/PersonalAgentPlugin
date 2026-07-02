---
name: kanban-render
description: >-
  Nutze um ADO-Work-Items als Kanban-HTML-Board mit Spalten nach Status (New/Active/Resolved/Closed) zu
  rendern: Quelle ADO-MCP (anonymisiert), Single-File-HTML, Output nach state/artifacts/ mit Fallback (§2.7).
---

## Zweck

Work-Items nach Status visualisieren (New / Active / Resolved / Closed).

## Quelle & Lib

- Items aus ADO (über general/ado-Skills) — **anonymisiert** (PII via Proxy als `<PERSON_…>`).
- Statisches HTML/CSS (Flexbox-Spalten); keine externe Lib nötig.

## Daten-Schema

```js
const columns = [
  { title: 'New',    cards: [{ id: 1234, title: 'Login Bug', assignee: '<PERSON_1>' }] },
  { title: 'Active', cards: [{ id: 1240, title: 'Feature X' }] }
];
```

## Aufbau

1. Work-Items je Status-Spalte gruppieren.
2. Karten mit ID + Titel + Badges (State/Assignee/Priority) — keine PII im Klartext.
3. Flexbox-Layout, eine Spalte je Status.

## Render-Pattern (§2.7)

- **Rich:** HTML-Board (Webview).
- **Fallback:** Markdown-Liste je Spalte + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/kanban-<ts>.html`.
