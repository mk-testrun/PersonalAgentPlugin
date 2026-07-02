---
name: presentation-from-adr
description: >-
  Nutze um aus ADR-Dateien in docs/adr/ eine reveal.js-Präsentation zu erzeugen — Architektur-Entscheidungen
  für Reviews/Stakeholder aufbereitet. Single-File-HTML über die CDN-Allowlist, Output nach state/artifacts/.
  ADR schreiben → experimental/adr-write.
---

## Zweck

Architektur-Entscheidungen (ADRs) als Präsentation aufbereiten — z.B. für Reviews/Stakeholder.

## Quelle & Lib

- Quelle: `docs/adr/NNNN-*.md` (erzeugt via experimental/adr-write).
- Rendering: reveal.js (CDN-Allowlist), Slides delegiert an `frontend-slides`.

## Aufbau

1. ADRs in `docs/adr/` einlesen (Auswahl: alle / nach Status / nach Nummern-Range).
2. Pro ADR eine Slide-Gruppe: **Titel + Status** → Kontext → Entscheidung → Konsequenzen.
3. Übersichts-Slide vorne (ADR-Nummer · Titel · Status als farbige Lozenge).
4. An `frontend-slides` übergeben (reveal.js-HTML).

## Render-Pattern (§2.7)

- **Rich:** lauffähige Präsentation (Webview).
- **Fallback:** Slide-Outline als Markdown + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/adr-slides-<ts>.html`.
