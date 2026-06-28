---
name: security-review
description: Nutze für statische Web-Sicherheitshärtung — Headers, AuthN/AuthZ, Cookies, Input-Validierung, Output-Encoding, Secrets. Sprachneutral.
---

## Scope

Code-/Konfig-basierte Security-Härtung (statisch), framework-neutral. Reine Secret-Funde → secrets-scan-Konzept; Dependency-CVEs → dependency-vuln.

## Checkliste

1. **SEC-HEADERS** — CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`. *(high)*
2. **SEC-AUTHN** — Auth an jedem nicht-öffentlichen Endpoint; kein auskommentiertes/umgangenes Auth. *(critical)*
3. **SEC-AUTHZ** — Serverseitige Rollen-/Ownership-Prüfung; keine IDOR. *(critical)*
4. **SEC-COOKIE** — Auth-Cookies `Secure`, `HttpOnly`, `SameSite`. *(high)*
5. **SEC-INPUT** — Serverseitige Whitelist-Validierung; Client-Checks nicht vertrauen. *(high)*
6. **SEC-ENCODE** — Kontextkorrektes Output-Encoding; kein `innerHTML`/`dangerouslySetInnerHTML` aus Nutzerdaten. *(critical)*
7. **SEC-INJECT** — Keine String-gebauten Queries/Commands; parametrisiert. *(critical)*
8. **SEC-CRYPTO** — Kein MD5/SHA1 für Passwörter (bcrypt/argon2/PBKDF2); kein Eigen-Krypto; TLS erzwungen. *(critical)*
9. **SEC-SECRETS** — Keine Keys/Tokens/Connection-Strings im Code/Config; nur über Env/Secret-Store. *(critical)*
10. **SEC-DEPS** — Keine offensichtlich unsicheren Defaults (CORS `*` mit Credentials, offene Debug-Endpoints). *(high)*
11. **SEC-LOGGING** — Keine Secrets/PII im Log; keine Stacktraces an den Client. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: security`, ruleId aus `SEC-*`. Bei `critical`/`high`: **[GATE]**.
