---
name: secrets-scan
description: >-
  Scans the whole repo (working tree AND git history) for hardcoded secrets with gitleaks, then maps
  the report to redacted findings[] via a bundled script. Use when asked to scan for secrets/leaked
  credentials, check for committed API keys/tokens/private keys, or audit history for secrets. Secret
  values are never emitted. Conceptual secret-handling (KeyVault) → security-review. Each find → [GATE].
---

# Secrets Scan

Concrete secret finds in the repo — working tree and **history** — mapped to findings[] with values
**redacted**. Detection is gitleaks; the bundled script does the deterministic mapping.

## When to Use This Skill

- "Scan for secrets / leaked credentials" · "did we commit an API key / private key?"
- Auditing git history for secrets before open-sourcing or after an incident

## Workflow

### Step 1 — Detect
```bash
gitleaks detect --no-banner --redact --report-format json --report-path leaks.json   # working tree + history
```

### Step 2 — Map to findings (run the script — deterministic, redacted)
```bash
node scripts/gitleaks-to-findings.mjs leaks.json
```
Emits findings[] (`area: security`, `SECR-*`) with the secret **redacted** (never the cleartext);
schema-valid (verify with `tools/validate-findings.mjs`).

### Step 3 — Verify & act
Drop obvious false positives. For each real find: **rotate** the secret, then **purge it from history**
(removal alone is insufficient — history retains it).

## Categories (ruleId)
`SECR-CLOUD` (AWS/Azure/GCP) · `SECR-TOKEN` (PAT/OAuth/API) · `SECR-DBCONN` (conn string w/ pwd) ·
`SECR-PRIVKEY` (private keys) · `SECR-SECRET` (generic). All **critical**. `.env.example`/docs
placeholders are not secrets (`SECR-EXAMPLE`, medium, only if a real value slipped in).

## Output

`findings[]` (`area: security`, `SECR-*`, **redacted**). Any real find → **[GATE]** (critical).
