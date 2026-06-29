---
name: web-artifacts-builder
description: Nutze um ein portables Single-File-HTML-Artefakt (alles inline) zu bauen.
---

## Zweck

Ein eigenständiges, teilbares HTML — Styles/Scripts/Daten **inline**, läuft offline per Doppelklick.

## Prinzipien

1. **Single-File** — kein externer Asset-Pfad; CSS in `<style>`, JS in `<script>`, Daten als JSON inline.
2. **CDN nur aus Allowlist** — falls Libs nötig (chart.js etc.), nur erlaubte CDNs; sonst self-contained.
3. **Graceful ohne Netz** — Kernfunktion ohne Online-Abhängigkeit; CDN nur progressiv.
4. **Accessibility** — semantisches HTML, `lang`, Kontrast, Fokus.

## Aufbau

1. Gerüst (`<!doctype html>` + `<head>` mit Meta/Title/Style).
2. Inhalt + Interaktion (Vanilla JS, Daten als `const data = {…}`).
3. Optional Cowork-Bridge: `window.cowork?.callMcpTool()` für Live-Refresh (progressiv, optional).

## Render-Pattern (§2.7)

- **Rich:** Artefakt im Webview.
- **Fallback:** Datei-Pfad + Kurzbeschreibung des Inhalts.

## Output

`state/artifacts/<name>-<ts>.html` (eine Datei, portabel).
