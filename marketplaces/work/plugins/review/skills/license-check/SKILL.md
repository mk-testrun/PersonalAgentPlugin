---
name: license-check
description: >-
  Checks package licenses (direct + transitive) against an SPDX policy — strong copyleft (GPL/AGPL)
  denied, weak copyleft and unknown/custom flagged — using a bundled script that emits findings[]. Use
  when asked about license compliance, copyleft/GPL conflicts, or whether a dependency is legally
  shippable. CVEs → dependency-vuln; EOL/LTS → lts-check. [GATE] on critical/high.
---

# License Check

Deterministic SPDX policy check over the dependency licenses.

## When to Use This Skill

- "Check licenses for compliance" · "any GPL/copyleft conflicts?" · "is this dependency shippable?"
- Pre-release legal gate

## Workflow

### Step 1 — Collect licenses
```bash
nuget-license -i App.sln -o json > licenses.json        # .NET
npx license-checker --json | node -e '...'              # JS → array of { name, license }
```
Normalize to a JSON array of `{ name, version?, license }` (license = SPDX id).

### Step 2 — Apply the policy (run the script — deterministic)
```bash
node scripts/license-gate.mjs licenses.json
```
Emits findings[] (`area: licenses`, `LIC-*`) for problematic licenses only (permissive = OK, no
finding); schema-valid (verify with `tools/validate-findings.mjs`).

## Policy (ruleId · severity)
- **LIC-DENY** *(critical)* — strong copyleft (GPL/AGPL/SSPL) in proprietary/distributed code.
- **LIC-WEAK** *(high)* — weak copyleft (LGPL/MPL/EPL) → check linking terms.
- **LIC-UNKNOWN** *(high)* — no/unclear license → not cleared.
- **LIC-CUSTOM** *(medium)* — non-OSI/custom → manual approval.
- Permissive (MIT/Apache-2.0/BSD/ISC) → OK; ensure attribution/NOTICE (`LIC-ATTRIB`, low) if required.

## Output

`findings[]` (`area: licenses`, `LIC-*`, SPDX id in `message`). On critical/high → **[GATE]**.
