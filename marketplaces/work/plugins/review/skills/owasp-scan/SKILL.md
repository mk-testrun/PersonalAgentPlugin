---
name: owasp-scan
description: >-
  Runs an OWASP Top 10 (2021) dynamic scan of the running app with OWASP ZAP headless (baseline) on
  localhost, then maps and triages the alerts to the Top 10 categories with concrete fixes. Use when
  asked for an OWASP scan, a dynamic/DAST security test, or to check a running app for the Top 10.
  Localhost only; complements the static security-review. Produces findings[] (area:security, OWASP-A0*).
mcp_tools:
  - playwright
---

# OWASP Top 10 Scan (dynamic)

Dynamic scan of the **running** app — finds what only shows at runtime (headers, auth flows, reflected
inputs). The static counterpart is `security-review`; dependency CVEs are `dependency-vuln`.

## When to Use This Skill

- "Run an OWASP / DAST / dynamic security scan" on a local app
- Checking a running app against the OWASP Top 10
- Pre-release security gate for a prototype

## Workflow

### Step 1 — Start & reach the app
Start the app, confirm reachable on `http://localhost:*` (max 30 s). Internet targets are blocked.

### Step 2 — ZAP baseline scan
Run ZAP headless baseline against the localhost URL (passive + a safe active subset).

### Step 3 — Map & triage
Map each alert to a Top 10 category and triage using
**[references/owasp-top10.md](references/owasp-top10.md)** (what each category means, typical ZAP alerts,
severity, fix direction). Filter noise; verify exploitability before reporting.

### Step 4 — Report
Emit `findings[]` with a `OWASP-A0*` ruleId and a concrete fix per finding.

## Output

`findings[]` (`area: security`, ruleId `OWASP-A01`…`A10`), severity per category/impact. On
critical/high → **[GATE]**. Cross-check component CVEs with `dependency-vuln` (A06).
