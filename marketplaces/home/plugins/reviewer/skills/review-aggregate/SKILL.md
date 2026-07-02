---
name: review-aggregate
description: >-
  Nutze um die findings[] mehrerer einzeln aufgerufener Reviewer-Skills zu einem Gesamtbericht zu verdichten:
  dedupliziert nach ruleId+file+line, sortiert nach Severity, setzt das Gate (critical/high) und rendert
  Markdown + interaktive HTML-Filter-UI. Findet nichts selbst — konsolidiert.
---

## Scope

Der **Verbund**-Skill: sammelt die `findings[]` der einzeln aufgerufenen Reviewer-Skills
und erzeugt **einen** Gesamtbericht. Findet selbst keine Befunde — er aggregiert.
Jeder Einzel-Skill bleibt eigenständig aufrufbar.

## Vorgehen

1. **Sammeln** — findings[] aller gelaufenen Reviewer-Skills (Schema: `docs/findings-schema.md`).
2. **Deduplizieren** — nach `ruleId + file + line`; höchste Severity behalten, Quellen mergen.
3. **Sortieren** — Severity: critical → high → medium → low → info; sekundär `area`, dann `file`.
4. **Top-N** — Executive Summary mit den Top 10 (Default).
5. **Gate** — Gate-Flag **true** bei ≥1 `critical`/`high` → **[GATE]**.
6. **Rendern** — Markdown **und** interaktives HTML.

## Berichtsaufbau

- **Executive Summary** — Zähler je Severity, Gate-Status, Top-N.
- **Per-Area-Sektionen** — security / accessibility / performance / deps / design / env / wcag.
- **Detailtabelle** — severity · area · ruleId · file:line · message · suggestion.

## Output

- Markdown: `state/reports/review-<date>.md`
- HTML: `state/reports/review-<date>.html` — Filter-UI (Severity / Area / Suche).

Aggregiertes findings[] + Gate-Flag zurückgeben. Bei gesetztem Gate: **[GATE]**.
