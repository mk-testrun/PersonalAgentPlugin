---
name: ai-readiness
description: >-
  Nutze um zu messen (0–100), wie gut ein beliebiges Code-Repo von KI-Agenten/Coding-Assistenten verstanden
  und bearbeitet werden kann: bewertet README/AGENTS.md, Struktur-Klarheit, Test-/Build-Auffindbarkeit und
  Doku. Liefert Score + priorisierte Empfehlungen. (Marketplace-Reife dagegen → meta/ai-readiness.)
---

## Scope

Bewertet, wie gut ein Repo von KI-Agenten verstanden und bearbeitet werden kann.
Kein Security-/Qualitäts-Review (dafür die anderen reviewer-Skills).

## Scoring-Dimensionen (je 0–20, Summe 0–100)

1. **AIR-DOCS** — README + `AGENTS.md`/`CLAUDE.md` vorhanden, aktuell, mit Setup/Run/Test-Befehlen. *(20)*
2. **AIR-STRUCTURE** — Klare, konventionelle Projektstruktur; sprechende Namen; keine Mega-Dateien. *(20)*
3. **AIR-TESTS** — Ausführbare Tests + dokumentierter Testbefehl; CI vorhanden. *(20)*
4. **AIR-TYPES** — Typisierung/Schemas/Contracts vorhanden (statt impliziter Annahmen). *(20)*
5. **AIR-AUTOMATION** — Lint/Format/Build als Skripte; deterministische Setup-Schritte. *(20)*

## Befunde

- Score < 40 → *(high)* „nicht agentenfreundlich", Top-3-Lücken nennen.
- Score 40–69 → *(medium)* konkrete Quick-Wins.
- Score ≥ 70 → *(info)* Feinschliff.

Pro fehlender Dimension ein finding mit konkretem Verbesserungsschritt.

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `AIR-*`, plus Gesamt-Score in der Summary.
