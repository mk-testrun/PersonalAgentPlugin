---
name: review-aggregate
description: Nutze um findings[] mehrerer Review-Skills zu einem Gesamtbericht zu verdichten — dedupliziert, sortiert, mit Gate und HTML-Filter-UI.
---

## Scope

Der **Verbund**-Skill: sammelt die `findings[]` der einzeln aufgerufenen Review-Skills
und erzeugt **einen** Gesamtbericht. Findet selbst keine neuen Befunde — er aggregiert.
Jeder Einzel-Skill bleibt eigenständig aufrufbar.

## Vorgehen

1. **Sammeln** — findings[] aller gelaufenen Review-Skills einlesen (Schema: `docs/findings-schema.md`).
2. **Deduplizieren** — nach `ruleId + file + line`; bei Duplikaten höchste Severity behalten, Quellen-Skills mergen.
3. **Sortieren** — Severity: critical → high → medium → low → info; sekundär nach `area`, dann `file`.
4. **Top-N** — Executive Summary mit den Top 10 (Default) nach Severity.
5. **Gate** — Gate-Flag **true**, sobald ≥1 `critical`/`high` existiert → **[GATE]** (Standardantwort „nein").
6. **Rendern** — Markdown **und** interaktives HTML.

## Berichtsaufbau

- **Executive Summary** — Gesamtzahl je Severity, Gate-Status, Top-N-Befunde.
- **Per-Area-Sektionen** — security / accessibility / performance / sql / deps / design / pipeline / env.
- **Detailtabelle** — severity · area · ruleId · file:line · message · suggestion.

## Output

- Markdown: `state/reports/review-<date>.md`
- HTML: `state/reports/review-<date>.html` — Filter-UI (Severity / Area / Freitext-Suche).

Aggregiertes findings[] + Gate-Flag zurückgeben. Bei gesetztem Gate: **[GATE]**.
