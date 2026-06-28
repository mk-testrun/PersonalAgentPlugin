---
name: license-check
description: Nutze um Paket-Lizenzen auf Copyleft-/Denylist-Konflikte zu prüfen (SPDX).
---

## Scope

Lizenzkonformität direkter und transitiver Pakete. CVEs → dependency-vuln; EOL → lts-check.

## Vorgehen

1. Lizenzen je Paket ermitteln (NuGet-Metadaten/`nuget-license`, `license-checker` für npm).
2. Gegen SPDX-Kategorien und Projekt-Denylist abgleichen.

## Checkliste

1. **LIC-DENY** — Strong-Copyleft (GPL-3.0, AGPL-3.0) in proprietärem/verteiltem Code → Konflikt. *(critical)*
2. **LIC-WEAK** — Weak-Copyleft (LGPL, MPL-2.0) → Bedingungen (dynamisches Linken) prüfen. *(high)*
3. **LIC-UNKNOWN** — Keine/unklare Lizenz → rechtlich nicht freigegeben. *(high)*
4. **LIC-CUSTOM** — Nicht-OSI-/Custom-Lizenz → manuelle Freigabe nötig. *(medium)*
5. **LIC-ATTRIB** — Permissive (MIT/Apache-2.0/BSD) ok, aber Attribution/NOTICE-Pflicht erfüllt? *(low)*
6. **LIC-COMPAT** — Lizenz-Mix untereinander/zur Projektlizenz kompatibel. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: licenses`, ruleId aus `LIC-*` (SPDX-ID in `message`). Bei `critical`/`high`: **[GATE]**.
