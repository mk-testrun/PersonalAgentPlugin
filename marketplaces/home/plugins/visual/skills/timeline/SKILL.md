---
name: timeline
description: Nutze um eine interaktive Timeline mit vis-timeline zu erstellen (Events/Zeiträume).
---

## Zweck

Ereignisse/Phasen über die Zeit darstellen (Projektverlauf, Historie).

## Lib/CDN

`vis-timeline` (CDN-Allowlist). `new vis.Timeline(container, items, options)`.

## Daten-Schema

```js
const items = [
  { id: 1, content: 'Kickoff', start: '2026-01-10' },
  { id: 2, content: 'Phase 1', start: '2026-01-15', end: '2026-02-10' }
];
```
Punkt-Event = nur `start`; Zeitraum = `start` + `end`. Optional `group` für Schwimmbahnen.

## Aufbau

1. Events sammeln, Punkt vs Zeitraum entscheiden.
2. `items` + optional `groups` (Lanes) bauen.
3. `options` (Zoom-Grenzen `min`/`max`, `stack: true`).
4. In HTML mit Container-`<div>` + CDN-Script einbetten.

## Render-Pattern (§2.7)

- **Rich:** interaktive Timeline (Webview).
- **Fallback:** chronologische Liste (Datum — Event) + Pfad zum HTML.

## Output

`state/artifacts/timeline-<ts>.html`.
