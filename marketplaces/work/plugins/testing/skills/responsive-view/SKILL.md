---
name: responsive-view
description: Nutze für visuelle Responsiveness-Prüfung einer lokalen Webanwendung.
---

## Schritte

1. Lokale App auf `http://localhost:*` prüfen (nur localhost!)
2. Breakpoints: Desktop (1440px), Tablet (768px), Mobile (375px)
3. Screenshot je Breakpoint
4. axe-core Accessibility-Scan
5. Pixel-Diff gegen Baseline (falls vorhanden)
6. HTML-Artefakt mit Screenshots + Diff → `state/artifacts/responsive-<date>.html`
