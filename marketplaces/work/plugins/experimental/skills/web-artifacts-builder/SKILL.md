---
name: web-artifacts-builder
description: Nutze um ein portables Single-File-HTML-Artefakt zu erstellen (CDN-Allowlist erzwungen).
---

## Zweck

Ein eigenständiges, teilbares HTML — Styles/Scripts/Daten inline, läuft offline.

## Prinzipien

1. **Single-File** — kein externer Asset-Pfad; CSS in `<style>`, JS in `<script>`, Daten als JSON inline.
2. **CDN nur aus Allowlist** — `policy/cdn-allowlist.json` ist verbindlich; nichts anderes laden.
3. **Graceful ohne Netz** — Kernfunktion ohne Online-Abhängigkeit.
4. **Accessibility** — semantisches HTML, `lang`, Kontrast, Fokus.

## Aufbau

1. Gerüst (`<!doctype html>` + `<head>`).
2. Inhalt + Interaktion (Vanilla JS, Daten als `const data = {…}`).
3. Optional Cowork-Bridge: `window.cowork?.callMcpTool()` für Refresh (progressiv).

## CDN-Allowlist

Nur Ressourcen aus `policy/cdn-allowlist.json`. Andere CDNs sind verboten.

## Render-Pattern (§2.7)

- **Rich:** Artefakt im Webview.
- **Fallback:** Datei-Pfad + Kurzbeschreibung.

## Output

`state/artifacts/<name>-<ts>.html` (eine Datei, portabel).
