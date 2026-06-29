---
name: security-review
description: >-
  Reasons about code like a security researcher — tracing how untrusted input flows to dangerous
  sinks — to find vulnerabilities that pattern-matchers miss. Use when asked to review or audit code
  for security, harden an app, or check for SQL injection, XSS, command injection, SSRF, broken
  access control (IDOR), weak crypto, hardcoded secrets, or insecure config — or for phrasings like
  "is this secure?", "security review", "audit this". Covers OWASP ASVS L2 across C#/.NET, SQL, JS/TS,
  and config; produces findings[] with severity + concrete fixes and a [GATE] on critical/high.
---

# Security Review

Static security hardening that reads code the way a human security researcher would: it follows
untrusted data from its source to dangerous sinks, reasons about auth/access intent, and proposes a
concrete fix for every finding. Nothing is auto-applied.

## When to Use This Skill

- Reviewing/auditing code or a diff for security weaknesses (`/review security`)
- Checking for injection (SQL/command/LDAP), XSS, SSRF, CSRF, deserialization
- Verifying authentication, authorization, and IDOR/object-ownership
- Finding hardcoded secrets/credentials or weak crypto in source/config
- Validating security headers, cookie flags, input validation, output encoding
- Any phrasing like "is this secure?", "harden this", "find vulnerabilities"

Not here: dynamic scans of a running app → `owasp-scan`; repo-wide secret sweep incl. history →
`secrets-scan`; dependency CVEs → `dependency-vuln`.

## How It Works

1. **Trace data flow** — follow user input (request params, headers, files, DB) to sinks (queries,
   shell, HTML, redirects, deserializers).
2. **Reason about intent** — is every non-public endpoint authenticated and authorized for *this* object?
3. **Self-verify** — re-examine each candidate to drop false positives.
4. **Rate & fix** — assign severity and attach a concrete patch.

## Execution Workflow

### Step 1 — Scope & stack
Identify the changed/target files and the stack (ASP.NET/Blazor, EF Core, JS/TS). For a diff, focus
on changed lines + their reachable callees.

### Step 2 — Category pass
Walk the categories in **[references/vuln-categories.md](references/vuln-categories.md)** (ruleId +
what to look for + .NET-specific signals + severity). Apply each to the in-scope code.

### Step 3 — Secrets & config
Scan for hardcoded credentials/keys and insecure configuration using
**[references/secret-patterns.md](references/secret-patterns.md)**. Report values **redacted**.

### Step 4 — Verify & rate
For each candidate, confirm exploitability (reachable from untrusted input, no mitigating control),
then rate per the severity scale in `docs/findings-schema.md`.

### Step 5 — Report
Emit `findings[]` and the human report per
**[references/report-format.md](references/report-format.md)**. Set **[GATE]** if any critical/high.

## Output

`findings[]` (schema: `docs/findings-schema.md`, `area: security`, ruleId from `SEC-*`/`OWASP-A0*`),
each with `severity`, `file:line`, `message`, `suggestion`. On critical/high → **[GATE]**
(default answer "no") and a one-line executive summary of the blocking issues.
