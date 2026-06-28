---
name: security-review
description: Nutze für statische Sicherheitshärtung — Headers, AuthN/AuthZ, Cookies, Input-Validierung, Output-Encoding, CSRF, Secrets-Handling.
---

## Scope

Code- und Konfig-basierte Security-Härtung (statisch). Für laufende-App-Scans → owasp-scan;
für reine Secret-Funde → secrets-scan; für Dependency-CVEs → dependency-vuln.

## Checkliste

1. **SEC-HEADERS** — CSP, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` gesetzt. *(high)*
2. **SEC-AUTHN** — Auth an jedem nicht-öffentlichen Endpoint; `[Authorize]`/Policies statt Ad-hoc-Checks; kein auskommentiertes Auth. *(critical)*
3. **SEC-AUTHZ** — Rollen-/Policy-Prüfung serverseitig; keine IDOR (Objekt-Ownership prüfen); kein „security by obscurity". *(critical)*
4. **SEC-COOKIE** — Auth-Cookies `Secure`, `HttpOnly`, `SameSite=Lax/Strict`; kurze Lebensdauer. *(high)*
5. **SEC-INPUT** — Server-seitige Validierung aller Eingaben (Whitelist); Model-Validation-Attribute; keine Vertrauensannahme auf Client-Checks. *(high)*
6. **SEC-ENCODE** — Output kontextkorrekt encodiert (HTML/JS/URL); in Blazor keine `MarkupString` aus Nutzerdaten. *(critical)*
7. **SEC-CSRF** — Antiforgery-Token für state-ändernde Requests; APIs nutzen Token/SameSite. *(high)*
8. **SEC-CRYPTO** — Kein MD5/SHA1 für Passwörter (→ ASP.NET Identity/PBKDF2/bcrypt); kein eigener Krypto-Code; TLS erzwungen. *(critical)*
9. **SEC-SECRETS** — Keine Credentials/Connection-Strings/Keys im Code oder appsettings; nur über `${secret:…}`/KeyVault. *(critical)*
10. **SEC-LOGGING** — Keine PII/Secrets im Log; Audit für sicherheitsrelevante Aktionen; keine Stacktraces an den Client. *(medium)*
11. **SEC-ERRORS** — Generische Fehlermeldungen nach außen; Detailfehler nur serverseitig. *(medium)*
12. **SEC-AUDIT** *(ehem. security-audit)* — Quertest gegen OWASP ASVS L2: Session-Management, Zugriffskontrolle, Datenschutz; Abweichungen als Befund. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: security`, ruleId aus `SEC-*`. Bei `critical`/`high`: **[GATE]** (Standardantwort „nein").
