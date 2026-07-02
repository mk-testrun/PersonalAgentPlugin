---
name: responsive-view
description: >-
  Nutze für die visuelle Responsiveness-Prüfung einer Web-App über Breakpoints (Desktop/Tablet/Mobile) mit
  Playwright — im Home-Marketplace auch gegen Internet-Targets. Erkennt Überlauf/abgeschnittene Elemente und
  liefert Screenshots + findings[] je Breakpoint.
---

## Schritte

1. Ziel-URL aufrufen (Home erlaubt Internet-Targets).
2. Breakpoints rendern: Desktop (1440px), Tablet (768px), Mobile (375px).
3. Screenshot je Breakpoint → `state/artifacts/responsive-<date>.html`.
4. axe-core-Scan je Breakpoint (Overlap mit accessibility-wcag vermeiden, nur Layout-bezogen).
5. Pixel-Diff gegen Baseline (falls vorhanden).

## Checkliste

1. **RESP-OVERFLOW** — Kein horizontales Scrollen / abgeschnittene Inhalte auf Mobile. *(high)*
2. **RESP-TAP** — Tap-Targets ≥ 44×44px, ausreichend Abstand. *(medium)*
3. **RESP-REFLOW** — Inhalt fließt um, keine fixe Breite die Viewport sprengt. *(high)*
4. **RESP-TEXT** — Lesbare Schriftgröße ohne Zoom; kein Text-Clipping. *(medium)*
5. **RESP-MEDIA** — Bilder/Medien skalieren, kein Layout-Shift. *(low)*

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `RESP-*`, plus Screenshot-Artefakt. Bei `critical`/`high`: **[GATE]**.
