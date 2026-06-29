# findings[] — geteiltes Review-Schema

Alle Review-Skills in Work und Home verwenden dieses Schema für `findings[]`.

## Schema

```json
{
  "severity": "critical|high|medium|low|info",
  "area": "accessibility|security|performance|design|sql|deps|licenses|pipeline|env|tests|coverage|wcag",
  "ruleId": "string",
  "file": "path",
  "line": 0,
  "message": "string",
  "suggestion": "string"
}
```

## Aggregations-Regeln

1. **Deduplizieren** nach `ruleId + file + line`
2. **Sortieren** nach Severity: critical → high → medium → low → info
3. **Top-N Summary** (default N=10)
4. **Gate-Flag** setzen wenn `critical` oder `high` vorhanden

## Validierung (Self-Check)

Jeder Review-Skill kann seine `findings[]` gegen dieses Schema prüfen — produzieren → validieren → fixen:

```bash
node tools/validate-findings.mjs <findings.json>   # oder: cat findings.json | node tools/validate-findings.mjs
```

Prüft Severity/Area-Enums, Pflichtfelder (`ruleId`, `message`) und Typen (`line` integer). Exit 0 = valide.
Das Skript ist **additiv** — es ersetzt keine Skill-Logik, es verifiziert nur den Output.

## Output-Format

- Markdown: `state/reports/review-<date>.md`
- HTML-Artefakt: interaktive Filter-UI (Severity / Area / Freitext-Suche)

## Severity-Definitionen

| Severity | Bedeutung |
|---|---|
| critical | Sicherheitslücke / Datenverlust-Risiko / OWASP Top 10 |
| high | Erheblicher Fehler, muss vor Merge behoben werden |
| medium | Verbesserungswürdig, sollte in nächstem Sprint |
| low | Kleinigkeit, kosmetisch oder best-practice |
| info | Beobachtung ohne Handlungsbedarf |
