---
name: html-dashboard
description: >-
  Nutze um ein HTML-Dashboard mit mehreren Widgets (KPIs, Charts, Tabellen) auf einer Seite zu bündeln:
  Single-File-HTML über die CDN-Allowlist, Output nach state/artifacts/ mit Fallback. CI-/Coverage-Kennzahlen
  speziell → metrics-dashboard.
---

## Zweck

Mehrere Kennzahlen/Visuals auf einer Seite bündeln (Status-Überblick).

## Lib/CDN

CSS-Grid-Layout + `chart.js`/`gridjs` je Widget (CDN-Allowlist); komponiert via chartjs-data/data-grid.

## Aufbau

1. **Widgets festlegen** — KPI-Karten (Zahl + Label + Trend), Charts, Tabellen.
2. **Layout** — responsives Grid (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`).
3. **Datenbindung** — je Widget Daten einsetzen.
4. **Single-File** — Styles inline, CDN-Scripts im `<head>`, portabel.

## Render-Pattern (§2.7)

- **Rich:** HTML-Dashboard (Webview).
- **Fallback:** je Widget eine Text-/Tabellen-Zusammenfassung + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/dashboard-<ts>.html`.
