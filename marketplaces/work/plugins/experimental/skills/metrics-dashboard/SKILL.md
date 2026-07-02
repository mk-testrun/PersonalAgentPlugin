---
name: metrics-dashboard
description: >-
  Nutze um ein Metriken-Dashboard aus CI-/Coverage-Artefakten (Coverage, Test-Ergebnisse, Build-Trends) auf
  einer Seite zu bündeln: Single-File-HTML über die CDN-Allowlist, Output nach state/artifacts/ mit Fallback.
  Allgemeine Widgets → html-dashboard.
---

## Zweck

CI-/Qualitäts-Kennzahlen (Coverage, Test-Ergebnisse, Build-Trends) auf einer Seite bündeln.

## Quelle & Lib

- Artefakte: Cobertura/coverlet-XML, Test-TRX/JUnit, Build-Logs.
- Rendering: `chart.js` für Trends + KPI-Karten (CDN-Allowlist); komponiert via `html-dashboard`/`chartjs-data`.

## Aufbau

1. **Kennzahlen extrahieren** — Branch-/Line-Coverage (Domain vs gesamt), Pass/Fail-Zahlen, Dauer.
2. **Gates spiegeln** — Coverage-Schwellen (z.B. Domain ≥80%, gesamt ≥70%) farblich (grün/rot).
3. **Trends** — wenn Verlaufsdaten vorhanden, Line-Chart über Builds.
4. **Komposition** — KPI-Karten + Charts in `html-dashboard`-Layout.

## Render-Pattern (§2.7)

- **Rich:** HTML-Dashboard (Webview).
- **Fallback:** Kennzahlen-Tabelle (Metrik · Wert · Gate) + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/metrics-<ts>.html`.
