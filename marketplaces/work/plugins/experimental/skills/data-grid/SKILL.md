---
name: data-grid
description: Nutze um eine interaktive Datentabelle mit Grid.js zu erstellen (Sortierung, Suche, Pagination).
---

## Zweck

Tabellarische Daten (Query-Ergebnisse, Listen) interaktiv durchsuch-/sortierbar darstellen.

## Lib/CDN

`gridjs` (CDN-Allowlist). `new gridjs.Grid({ columns, data, sort, search, pagination }).render(el)`.

## Daten-Schema

```js
const columns = ['Id', 'Titel', { name: 'Status', formatter: c => c }];
const data = [[1, 'Auftrag A', 'offen'], [2, 'Auftrag B', 'erledigt']];
```

## Aufbau

1. Spalten + optionale Formatter definieren.
2. Zeilen als Array-of-Arrays / Objektliste.
3. `sort: true`, `search: true`, `pagination: { limit: 25 }` aktivieren.
4. In HTML mit Container + CDN-Script/CSS einbetten.

## Render-Pattern (§2.7)

- **Rich:** interaktives Grid (Webview).
- **Fallback:** Markdown-Tabelle + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/grid-<ts>.html`.
