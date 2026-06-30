---
name: dependency-vuln
description: >-
  Finds vulnerable dependencies (direct and transitive) via `dotnet list package --vulnerable` and
  `npm audit`, then converts the audit output to findings[] with a bundled script and ranks by CVSS.
  Use when asked to check dependencies for CVEs, run an audit, or assess supply-chain risk. EOL/LTS
  status → lts-check; license conformance → license-check. [GATE] on critical/high.
---

# Dependency Vulnerabilities

Known CVEs in direct **and** transitive packages, mapped deterministically to findings[].

## When to Use This Skill

- "Check dependencies for vulnerabilities / CVEs" · "run an audit" · supply-chain risk
- Pre-merge/pre-release dependency gate

## Workflow

### Step 1 — Produce the audit
```bash
dotnet list package --vulnerable --include-transitive --format json > audit.json   # .NET
npm audit --omit=dev --json > audit.json                                            # JS
```

### Step 2 — Convert to findings (run the script — deterministic)
```bash
node scripts/audit-to-findings.mjs audit.json        # auto-detects dotnet vs npm
```
Emits findings[] (`area: deps`, ruleId `DEP-CRIT|HIGH|MED|LOW`), severity from the audit, transitive
flagged with the nearest-direct-package fix hint. The output is schema-valid (verify with
`tools/validate-findings.mjs`).

### Step 3 — Triage & fix
Per finding: smallest safe target version + breaking-change note. Transitive → bump/override the
nearest direct package. No patch → document a mitigation and mark the risk.

## Checklist (severity from CVSS)
- **DEP-CRIT** CVSS ≥ 9.0 / actively exploited · **DEP-HIGH** 7.0–8.9 · **DEP-MED** 4.0–6.9 · **DEP-LOW** < 4.0
- **DEP-TRANSITIVE** only transitive → override at the nearest direct dependency.
- **DEP-NOFIX** no patch → mitigation + risk note *(high)*.

## Output

`findings[]` (`area: deps`, `DEP-*`, advisory in `message`). On critical/high → **[GATE]**.
