---
name: chartjs-data
description: Nutze um einen Chart.js-basierten Daten-Chart zu erstellen (Bar, Line, Pie, Radar, Scatter).
---

## Zweck

Quantitative Daten als interaktives Diagramm.

## Lib/CDN

`chart.js` (CDN-Allowlist). `new Chart(ctx, config)`.

## Daten-/Config-Schema

```js
const config = {
  type: 'line',
  data: { labels: ['KW1','KW2','KW3'], datasets: [{ label: 'Velocity', data: [20, 26, 23] }] },
  options: { responsive: true, plugins: { legend: { position: 'top' } } }
};
```

## Aufbau

1. Chart-Typ + Achsen/Labels aus den Daten ableiten (`bar`/`line`/`pie`/`radar`/`scatter`).
2. `datasets` befüllen (ein Dataset je Serie), sinnvolle Achsentitel.
3. `options` für Responsiveness/Legende/Tooltip.
4. In HTML mit `<canvas>` + CDN-Script einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** kompakte Wertetabelle + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/chart-<ts>.html`.
