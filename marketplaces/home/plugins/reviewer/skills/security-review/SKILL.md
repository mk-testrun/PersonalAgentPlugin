---
name: security-review
description: >-
  Reviews code like a security researcher — tracing untrusted input to dangerous sinks — across
  JavaScript/TypeScript, Python, Go, and other stacks. Use when asked to review or audit code for
  security, harden a project, or check for injection, XSS, SSRF, broken access control, weak crypto,
  hardcoded secrets, or insecure config — or phrasings like "is this secure?", "security review",
  "find vulnerabilities". Language-neutral; produces findings[] with severity + concrete fixes and a
  [GATE] on critical/high.
---

# Security Review (Home)

Static security hardening for private projects, language-neutral. It follows untrusted data from its
source to dangerous sinks, reasons about access intent, and proposes a concrete fix per finding.

## When to Use This Skill

- Reviewing/auditing code or a diff for security weaknesses
- Checking injection (SQL/command), XSS, SSRF, CSRF, deserialization
- Verifying authentication/authorization and object ownership (IDOR)
- Finding hardcoded secrets or insecure configuration
- "is this secure?", "harden this", "find vulnerabilities"

## Workflow

### Step 1 — Scope & stack
Identify the stack (Node/Python/Go/…) and the in-scope files (changed lines for a diff).

### Step 2 — Category pass
Walk **[references/vuln-categories.md](references/vuln-categories.md)** (ruleId + what to look for +
per-language signals + severity) over the in-scope code.

### Step 3 — Secrets & config
Scan for hardcoded credentials/keys and insecure config via
**[references/secret-patterns.md](references/secret-patterns.md)**. Report values **redacted**.

### Step 4 — Verify & rate
Confirm each candidate is reachable from untrusted input with no mitigating control; rate per
`docs/findings-schema.md`.

### Step 5 — Report
Emit `findings[]` (`area: security`, `SEC-*`/`OWASP-A0*`), each with severity, file:line, message,
suggestion. Set **[GATE]** on any critical/high.

## Output

`findings[]` + a short executive summary. On critical/high → **[GATE]** (default "do not merge").
