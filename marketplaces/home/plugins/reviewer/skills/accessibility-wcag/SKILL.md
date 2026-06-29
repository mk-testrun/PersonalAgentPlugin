---
name: accessibility-wcag
description: Nutze für eine WCAG 2.2 Accessibility-Prüfung (A/AA/AAA, Ziel-Stufe wählbar) — auch gegen Internet-Targets.
mcp_tools:
  - playwright
---

## Parameter

- Ziel-Stufe: A / AA (default) / AAA
- Target: beliebige URL (Home erlaubt Internet-Targets)

## Schritte

1. Playwright-Browser öffnen, Ziel-URL aufrufen.
2. axe-core ausführen.
3. Befunde je WCAG-Kriterium: Pass / Fail / NA, getrennt nach A/AA/AAA.

## Checkliste (Schwerpunkte)

1. **WCAG-1.1.1** — Alt-Texte für Nicht-Text-Inhalte. *(high)*
2. **WCAG-1.4.3** — Kontrastverhältnis Text ≥ 4.5:1 (AA). *(high)*
3. **WCAG-2.1.1** — Volle Tastaturbedienbarkeit, keine Keyboard-Traps. *(critical)*
4. **WCAG-2.4.7** — Sichtbarer Fokus-Indikator. *(medium)*
5. **WCAG-4.1.2** — Name/Rolle/Wert für UI-Komponenten (ARIA korrekt). *(high)*
6. **WCAG-3.3.x** — Formular-Labels & Fehlermeldungen zugänglich. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: wcag`, ruleId aus `WCAG-*`, severity nach Impact.
Für rechtliches Mapping + Erklärung: accessibility-bfsg anschließen. Bei `critical`/`high`: **[GATE]**.
