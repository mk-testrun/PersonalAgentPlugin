---
name: dependency-vuln
description: Nutze für verwundbare Abhängigkeiten (dotnet list package --vulnerable, npm audit) inkl. transitiver Pakete.
---

## Scope

Bekannte CVEs in direkten **und** transitiven Paketen. LTS-/EOL-Versionsstatus → lts-check;
Lizenzkonformität → license-check.

## Vorgehen

1. `dotnet list package --vulnerable --include-transitive` (alle Projekte).
2. Für JS-Anteile `npm audit --omit=dev` bzw. `--json`.
3. Treffer nach CVSS einstufen, transitiv → nächstes direktes Paket als Fix-Hebel benennen.

## Checkliste

1. **DEP-CRIT** — CVE mit CVSS ≥ 9.0 oder bekannt aktiv ausgenutzt. *(critical)*
2. **DEP-HIGH** — CVSS 7.0–8.9. *(high)*
3. **DEP-MED** — CVSS 4.0–6.9. *(medium)*
4. **DEP-TRANSITIVE** — Verwundbarkeit nur transitiv → direktes Paket pinnen/anheben oder `<PackageReference>`-Override. *(severity nach CVSS)*
5. **DEP-FIX** — Je Fund: kleinste sichere Zielversion + Breaking-Change-Hinweis. *(info)*
6. **DEP-NOFIX** — Kein Patch verfügbar → Mitigation/Workaround dokumentieren, Risiko markieren. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: deps`, ruleId aus `DEP-*` (CVE-ID in `message`). Bei `critical`/`high`: **[GATE]**.
