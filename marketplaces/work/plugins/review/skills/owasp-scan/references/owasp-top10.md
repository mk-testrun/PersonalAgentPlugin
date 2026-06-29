# OWASP Top 10 (2021) — scan reference

Each: **meaning** · **typical ZAP/runtime signals** · **severity** · **fix direction**.

## A01 Broken Access Control *(critical)*
Missing/auth-bypass, IDOR, directory traversal, force-browsing to admin URLs.
ZAP: access to restricted paths without auth, parameter tampering. → Enforce authz server-side per object.

## A02 Cryptographic Failures *(high)*
No TLS/HSTS, weak ciphers, sensitive data in cleartext or weak hashing.
ZAP: missing HSTS, mixed content, cookies without Secure. → TLS everywhere, HSTS, strong hashing.

## A03 Injection *(critical)*
SQL/NoSQL/command/LDAP injection, reflected/stored XSS.
ZAP: XSS reflection, SQLi error signatures. → Parameterize; context-encode output.

## A04 Insecure Design *(high)*
Missing rate limits, abusable workflows, no anti-automation.
Runtime: brute-force possible, no lockout. → Threat-model the flow; add limits/controls.

## A05 Security Misconfiguration *(high)*
Default creds, verbose errors, open debug endpoints, missing security headers.
ZAP: missing CSP/X-Content-Type-Options, stack traces. → Harden config; security headers.

## A06 Vulnerable & Outdated Components *(high)*
Known CVEs in server/framework/libs.
ZAP: server banner/version disclosure. → Cross-check `dependency-vuln`; upgrade.

## A07 Identification & Authentication Failures *(high)*
Weak session IDs, no lockout, credential stuffing, session fixation.
ZAP: weak session cookie, session not rotated on login. → Strong session mgmt, lockout, MFA.

## A08 Software & Data Integrity Failures *(high)*
Unsigned updates, insecure deserialization, untrusted CI/CD artifacts.
→ Sign/verify; safe serializers with fixed types.

## A09 Security Logging & Monitoring Failures *(medium)*
Security-relevant events not logged/alerted.
→ Log auth/authz failures + admin actions; alert on anomalies.

## A10 Server-Side Request Forgery (SSRF) *(high)*
Server fetches user-controlled URLs without an allowlist.
ZAP: out-of-band interaction. → Allowlist hosts/schemes; block internal/metadata ranges.

## Triage rules
- Verify exploitability before reporting (ZAP has false positives).
- Map every reported alert to exactly one A0x; set severity from category + real impact.
- A passive-only finding (e.g. missing header) is usually high/medium, not critical, unless it enables a chain.
