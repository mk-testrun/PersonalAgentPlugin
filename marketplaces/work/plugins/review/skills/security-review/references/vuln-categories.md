# Vulnerability Categories (security-review)

## Contents
- Injection (SEC-INJECT, SEC-SQL)
- Cross-Site Scripting (SEC-XSS)
- Access control & IDOR (SEC-AUTHZ, SEC-AUTHN)
- SSRF & request forgery (SEC-SSRF, SEC-CSRF)
- Deserialization (SEC-DESER)
- Cryptography (SEC-CRYPTO)
- Security headers & cookies (SEC-HEADERS, SEC-COOKIE)
- Input validation & output encoding (SEC-INPUT, SEC-ENCODE)
- Error handling & logging (SEC-ERRORS, SEC-LOGGING)

Each entry: **what to look for** · **.NET/Blazor signals** · **severity** · **fix direction**.

## Injection
- **SEC-SQL** *(critical)* — String-built SQL or `FromSqlRaw`/`ExecuteSqlRaw` with interpolated user input.
  → Parameterize; use LINQ or `FromSqlInterpolated`. Signal: `$"... {userInput} ..."` inside a query.
- **SEC-INJECT** *(critical)* — Command/LDAP/path built from input (`Process.Start`, `ProcessStartInfo.Arguments`).
  → Use argument arrays/allowlists; never shell-concatenate.

## Cross-Site Scripting
- **SEC-XSS** *(critical)* — Untrusted data rendered without encoding. Blazor: `MarkupString`/`@((MarkupString)x)`
  from user data; JS: `innerHTML`, `dangerouslySetInnerHTML`. → Render as text; sanitize if HTML is required.

## Access control & IDOR
- **SEC-AUTHN** *(critical)* — Non-public endpoint/page without `[Authorize]`/policy; commented-out auth.
- **SEC-AUTHZ** *(critical)* — Object accessed by id without verifying the caller owns it (IDOR);
  role/policy checked client-side only. → Enforce ownership/role server-side on every access.

## SSRF & request forgery
- **SEC-SSRF** *(high)* — Server fetches a user-controlled URL (`HttpClient.GetAsync(userUrl)`) without an
  allowlist. → Allowlist hosts/schemes; block internal ranges/metadata IPs.
- **SEC-CSRF** *(high)* — State-changing endpoint without antiforgery token; cookie auth without `SameSite`.

## Deserialization
- **SEC-DESER** *(high)* — `BinaryFormatter`, `TypeNameHandling.All` (Json.NET), or deserializing untrusted
  payloads into polymorphic types. → Avoid; use safe serializers with fixed types.

## Cryptography
- **SEC-CRYPTO** *(critical)* — MD5/SHA1 for passwords; `Random` for tokens; hardcoded IV/key; ECB mode.
  → ASP.NET Identity/PBKDF2/bcrypt/argon2; `RandomNumberGenerator` for secrets; authenticated encryption.

## Security headers & cookies
- **SEC-HEADERS** *(high)* — Missing CSP, HSTS, `X-Content-Type-Options: nosniff`, frame-ancestors.
- **SEC-COOKIE** *(high)* — Auth cookies without `Secure`/`HttpOnly`/`SameSite`.

## Input validation & output encoding
- **SEC-INPUT** *(high)* — No server-side allowlist validation; trusting client-side checks only.
- **SEC-ENCODE** *(critical)* — Output not contextually encoded (HTML/JS/URL/attribute).

## Error handling & logging
- **SEC-ERRORS** *(medium)* — Stack traces/detailed errors returned to the client.
- **SEC-LOGGING** *(medium)* — Secrets/PII written to logs; no audit for security-relevant actions.
