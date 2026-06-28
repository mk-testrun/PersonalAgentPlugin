---
name: accessibility-bfsg
description: Nutze um WCAG-Befunde auf BFSG/BITV 2.0 zu mappen und eine publizierfähige „Erklärung zur Barrierefreiheit" (§12 BFSG) zu erzeugen.
---

## Scope

Rechtliches Mapping deutscher Barrierefreiheit. Voraussetzung: WCAG-Befunde aus
`accessibility-wcag`. Erzeugt zusätzlich die gesetzlich geforderte Erklärung.

## Vorgehen

1. WCAG-2.2-Befunde (aus accessibility-wcag) übernehmen.
2. Jedes Kriterium auf BITV-2.0-Anlage / BFSG-Anforderung mappen.
3. Konformitätsgrad ableiten und die Erklärung generieren.

## Checkliste — BFSG/BITV-Mapping

1. **BFSG-MAP** — Jeder WCAG-AA-Fail einer BITV-2.0-Anforderung zugeordnet. *(severity vom WCAG-Impact)*
2. **BFSG-SCOPE** — Geltungsbereich geklärt (öffentlich zugängliche Dienstleistung / B2C ab 28.06.2025). *(info)*
3. **BFSG-CONFORM** — Konformitätsstatus: „vollständig | teilweise | nicht konform" begründet. *(high bei „nicht konform")*
4. **BFSG-FEEDBACK** — Feedback-Mechanismus + Kontakt für Barriere-Meldungen vorhanden. *(medium)*
5. **BFSG-ENFORCE** — Hinweis auf Durchsetzungsverfahren/Schlichtungsstelle enthalten. *(low)*

## Erklärung zur Barrierefreiheit (§12 BFSG) — Vorlage

```markdown
# Erklärung zur Barrierefreiheit

**Geltungsbereich:** <Anwendung/Domain>
**Stand:** <YYYY-MM-DD>  ·  **Erstellt auf Basis:** Selbstbewertung / WCAG-2.2-Prüfung

## Konformitätsstatus
<vollständig | teilweise | nicht> konform mit BITV 2.0 / EN 301 549.

## Nicht barrierefreie Inhalte
- <Befund + betroffenes WCAG-Kriterium + geplante Behebung/Datum>

## Feedback & Kontakt
<E-Mail/Formular für Barriere-Meldungen>

## Durchsetzungsverfahren
<Schlichtungsstelle / zuständige Aufsicht>
```

Ausgabe als Markdown; optionale Confluence-Veröffentlichung über `doku/confluence-draft` + **[CONFIRM]**.

## Output

findings[] nach `docs/findings-schema.md`, `area: accessibility`, ruleId aus `BFSG-*`,
**plus** die fertige Erklärung als Markdown-Artefakt. Bei `critical`/`high`: **[GATE]**.
