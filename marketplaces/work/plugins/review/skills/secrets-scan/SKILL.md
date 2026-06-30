---
name: secrets-scan
description: >-
  Scans the whole repo (working tree AND git history) for hardcoded secrets with betterleaks using its
  new expressions-based config (Expr filter/validate with live HTTP validation), then maps the report to
  redacted findings[] via a bundled script. Use when asked to scan for secrets/leaked credentials, check
  for committed API keys/tokens/private keys, or audit history for secrets. Secret values are never
  emitted. Conceptual secret-handling (KeyVault) → security-review. Each find → [GATE].
---

# Secrets Scan

Concrete secret finds in the repo — working tree and **history** — mapped to findings[] with values
**redacted**. Detection is **betterleaks** (the gitleaks successor), driven by its **expressions** config
(`.betterleaks.toml`: Expr `filter`/`validate`, live HTTP validation — not the old allowlist/regex
method). The bundled script does the deterministic, never-leaking mapping. CI uses kingfisher; the local
pre-push layer is `general/secrets-prepush-hook`.

## When to Use This Skill

- "Scan for secrets / leaked credentials" · "did we commit an API key / private key?"
- Auditing git history for secrets before open-sourcing or after an incident

## Workflow

### Step 0 — Config (once per repo)
Drop the expressions config at the repo root (template in `templates/betterleaks.toml`):
```bash
cp templates/betterleaks.toml .betterleaks.toml   # Expr filter/validate; tune to taste
```

### Step 1 — Detect (native betterleaks, expressions config)
```bash
betterleaks dir . --config .betterleaks.toml --redact --no-banner --report-format json --report-path leaks.json        # working tree
betterleaks git . --config .betterleaks.toml --redact --no-banner --report-format json --report-path history.json      # full history
```
`--redact` keeps values out of the report; the `validate` expressions confirm which finds are **live**.

### Step 2 — Map to findings (run the script — deterministic, redacted)
```bash
node scripts/betterleaks-to-findings.mjs leaks.json history.json
```
Emits findings[] (`area: security`, `SECR-*`) with the secret **redacted** (never the cleartext) and a
`[LIVE — validated active]` tag when betterleaks validated it; schema-valid (verify with
`tools/validate-findings.mjs`).

### Step 3 — Verify & act
Expressions already drop most false positives. For each real find: **rotate** the secret, then **purge it
from history** (removal alone is insufficient — history retains it). Prioritise `[LIVE]` finds first.

## Categories (ruleId)
`SECR-CLOUD` (AWS/Azure/GCP) · `SECR-TOKEN` (PAT/OAuth/API) · `SECR-DBCONN` (conn string w/ pwd) ·
`SECR-PRIVKEY` (private keys) · `SECR-SECRET` (generic). All **critical**. `.env.example`/docs
placeholders are not secrets (handled by the `filter` expression; `SECR-EXAMPLE`, medium, only if a real
value slipped in).

## Output

`findings[]` (`area: security`, `SECR-*`, **redacted**). Any real find → **[GATE]** (critical).
