---
name: html-dashboard
description: >-
  Nutze um mehrere Widgets (KPIs, Charts, Tabellen) als Status-Übersicht auf einer Seite zu bündeln:
  Single-File-HTML über die CDN-Allowlist, Output nach state/artifacts/ mit Fallback. Einzel-Chart →
  chartjs-data; Tabelle → table-as-grid.
---

## Zweck

Mehrere Kennzahlen/Visuals auf einer Seite zusammenführen (Status-Übersicht).

## Lib/CDN

CSS-Grid-Layout + `chart.js`/`gridjs` je Widget (CDN-Allowlist). Komposition delegiert an chartjs-data/table-as-grid.

## Aufbau

1. **Widgets festlegen** — KPI-Karten (Zahl + Label + Trend), Charts, Tabellen.
2. **Layout** — responsives CSS-Grid (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`).
3. **Datenbindung** — je Widget Daten einsetzen; Charts via chartjs-data, Tabellen via table-as-grid.
4. **Single-File** — Styles inline, CDN-Scripts im `<head>`, portabel.

## Render-Pattern (§2.7)

- **Rich:** HTML-Dashboard (Webview).
- **Fallback:** je Widget eine Text-/Tabellen-Zusammenfassung + Pfad zum HTML.

## Output

`state/artifacts/dashboard-<ts>.html`.
