---
name: owasp-scan
description: Nutze für einen OWASP-Top-10-Scan der laufenden App (ZAP headless, nur localhost).
mcp_tools:
  - playwright
---

## Scope

Dynamischer Scan der **laufenden** App auf `http://localhost:*` (ZAP baseline/headless).
Statische Härtung → security-review. Kein Internet-Target.

## Vorgehen

1. App lokal starten, Erreichbarkeit prüfen (max. 30 s).
2. ZAP headless baseline-Scan gegen die localhost-URL.
3. Alerts auf die OWASP-Top-10-Kategorien mappen, Rauschen filtern, je Fund Fix-Vorschlag.

## Checkliste (OWASP Top 10:2021)

1. **OWASP-A01 Broken Access Control** — fehlende Authz, IDOR, Directory-Traversal, Force-Browsing. *(critical)*
2. **OWASP-A02 Cryptographic Failures** — fehlendes TLS/HSTS, schwache Cipher, Klartext-Transport sensibler Daten. *(high)*
3. **OWASP-A03 Injection** — SQL/NoSQL/Command/LDAP-Injection, reflektiertes/stored XSS. *(critical)*
4. **OWASP-A04 Insecure Design** — fehlende Rate-Limits, missbrauchbare Workflows. *(high)*
5. **OWASP-A05 Security Misconfiguration** — Default-Creds, offene Debug-Endpoints, fehlende Security-Header. *(high)*
6. **OWASP-A06 Vulnerable Components** — bekannte CVEs in Server/Libs (Cross-Check dependency-vuln). *(high)*
7. **OWASP-A07 Auth Failures** — schwache Session-IDs, fehlendes Lockout, Credential-Stuffing möglich. *(high)*
8. **OWASP-A08 Integrity Failures** — unsignierte Updates, unsichere Deserialisierung. *(high)*
9. **OWASP-A09 Logging/Monitoring Failures** — sicherheitsrelevante Events nicht geloggt. *(medium)*
10. **OWASP-A10 SSRF** — serverseitige Requests auf nutzerkontrollierte URLs ohne Allowlist. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: security`, ruleId aus `OWASP-A0*`. Bei `critical`/`high`: **[GATE]**.
