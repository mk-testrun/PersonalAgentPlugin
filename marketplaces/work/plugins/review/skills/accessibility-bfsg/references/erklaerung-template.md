# Template — „Erklärung zur Barrierefreiheit" (§12 BFSG)

Fill from the WCAG audit results and the mapping in `bitv-mapping.md`. Output as Markdown to
`state/artifacts/`; optional Confluence publish via `doku/confluence-draft` + [CONFIRM].

```markdown
# Erklärung zur Barrierefreiheit

**Geltungsbereich:** <Anwendung / Domain>
**Stand:** <YYYY-MM-DD>  ·  **Basis:** Selbstbewertung / WCAG-2.2-AA-Prüfung (axe-core + manuell)

## Konformitätsstatus
Diese Anwendung ist <vollständig | teilweise | nicht> konform mit BITV 2.0 / EN 301 549
(WCAG 2.2 AA).

## Nicht barrierefreie Inhalte
<je Fail eine Zeile:>
- <Beschreibung> — WCAG <Kriterium, z.B. 1.4.3> — geplante Behebung: <Datum oder „in Bearbeitung">

## Erstellung dieser Erklärung
Erstellt am <Datum> auf Basis einer <Selbstbewertung> mit axe-core und manueller Prüfung der
Kriterien, die Tools nicht automatisch erkennen.

## Feedback & Kontakt
Barrieren melden: <E-Mail / Formular-URL>. Wir antworten innerhalb von <Frist>.

## Durchsetzungsverfahren
Bei nicht zufriedenstellender Antwort: <zuständige Schlichtungsstelle / Aufsichtsbehörde + Link>.
```

## Quality checks before publishing
- Every listed non-conformance cites a concrete WCAG criterion.
- Status matches the audit (no "vollständig konform" while AA fails exist).
- Feedback contact and enforcement reference are real and reachable.
- Date is current.
