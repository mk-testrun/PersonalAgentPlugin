---
name: accessibility-wcag
description: Nutze für eine WCAG 2.2 Accessibility-Prüfung (A/AA/AAA, Ziel-Stufe wählbar).
mcp_tools:
  - playwright
---

## Parameter

- Ziel-Stufe: A / AA (default) / AAA
- Target: `http://localhost:*` (nur localhost)

## Schritte

1. Playwright-Browser öffnen, Ziel-URL aufrufen
2. axe-core ausführen
3. Befunde je WCAG-Kriterium: Pass / Fail / NA
4. Separate Sektionen für A, AA, AAA
5. Für jedes Fail: konkreter Fix-Vorschlag
6. findings[] mit area: wcag, severity nach Impact

## Hinweis

Für BFSG-Mapping: accessibility-bfsg nach diesem Skill ausführen.
