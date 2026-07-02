---
name: chartjs-data
description: >-
  Nutze um quantitative Daten als interaktiven Chart.js-Chart (Bar, Line, Pie, Doughnut, Radar, Scatter) zu
  rendern: Single-File-HTML über die CDN-Allowlist, Output nach state/artifacts/ mit garantiertem Fallback
  (§2.7). Tabellarisch → table-as-grid; mehrere Widgets → html-dashboard.
---

## Zweck

Quantitative Daten als interaktives Diagramm.

## Lib/CDN

`chart.js` (CDN-Allowlist). `new Chart(ctx, config)`.

## Chart-Typ wählen

| Typ | Wofür |
|---|---|
| `bar` | Kategorien vergleichen |
| `line` | Verlauf über Zeit |
| `pie`/`doughnut` | Anteile am Ganzen |
| `radar` | Mehrdimensionaler Vergleich |
| `scatter` | Korrelation zweier Größen |

## Daten-/Config-Schema

```js
const config = {
  type: 'bar',
  data: {
    labels: ['Jan','Feb','Mär'],
    datasets: [{ label: 'Umsatz', data: [12, 19, 8] }]
  },
  options: { responsive: true, plugins: { legend: { position: 'top' } } }
};
```

## Aufbau

1. Typ + Achsen/Labels aus den Daten ableiten.
2. `datasets` befüllen (ein Dataset je Serie); sinnvolle Achsentitel.
3. `options` für Responsiveness/Legende/Tooltip; bei Zeitachsen passende Skala.
4. In HTML-Template mit `<canvas>` + CDN-Script einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML inline (Webview).
- **Fallback:** kompakte Wertetabelle + Pfad zum HTML.

## Output

`state/artifacts/chart-<ts>.html`.
