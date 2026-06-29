---
name: table-as-grid
description: Nutze um eine interaktive Datentabelle mit Grid.js zu erstellen (Sortierung, Suche, Pagination).
---

## Zweck

Tabellarische Daten interaktiv durchsuch-/sortierbar darstellen.

## Lib/CDN

`gridjs` (CDN-Allowlist). `new gridjs.Grid({ columns, data }).render(el)`.

## Daten-Schema

```js
const columns = ['Name', 'Status', { name: 'Betrag', formatter: c => `€${c}` }];
const data = [['Auftrag A', 'offen', 120], ['Auftrag B', 'erledigt', 80]];
```

## Aufbau

1. Spalten definieren (Header + optional Formatter/Sort).
2. Zeilen als Array-of-Arrays oder Objektliste.
3. Features aktivieren: `sort: true`, `search: true`, `pagination: { limit: 20 }`.
4. In HTML mit Container + CDN-Script + Grid.js-CSS einbetten.

## Render-Pattern (§2.7)

- **Rich:** interaktives Grid (Webview).
- **Fallback:** Markdown-Tabelle + Pfad zum HTML.

## Output

`state/artifacts/grid-<ts>.html`.
