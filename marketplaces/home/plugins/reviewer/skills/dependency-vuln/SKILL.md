---
name: dependency-vuln
description: Nutze für verwundbare Abhängigkeiten (npm audit, pip-audit, dotnet list package --vulnerable) inkl. transitiver Pakete.
---

## Scope

Bekannte CVEs in direkten und transitiven Paketen, multi-ökosystem. LTS-/EOL → lts-check; Lizenzen → ai-readiness/manuell.

## Vorgehen

1. Je Ökosystem: `npm audit --omit=dev`, `pip-audit`, `dotnet list package --vulnerable --include-transitive`.
2. GitHub-Kontext: Dependabot-Alerts berücksichtigen, wenn vorhanden.
3. Treffer nach CVSS einstufen; transitiv → direktes Paket als Fix-Hebel benennen.

## Checkliste

1. **DEP-CRIT** — CVSS ≥ 9.0 oder aktiv ausgenutzt. *(critical)*
2. **DEP-HIGH** — CVSS 7.0–8.9. *(high)*
3. **DEP-MED** — CVSS 4.0–6.9. *(medium)*
4. **DEP-TRANSITIVE** — Nur transitiv verwundbar → Override/Resolution auf sichere Version. *(severity nach CVSS)*
5. **DEP-FIX** — Kleinste sichere Zielversion + Breaking-Change-Hinweis. *(info)*
6. **DEP-NOFIX** — Kein Patch → Mitigation dokumentieren, Risiko markieren. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: deps`, ruleId aus `DEP-*` (CVE-ID in `message`). Bei `critical`/`high`: **[GATE]**.
