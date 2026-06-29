# Vulnerability Categories (security-review, language-neutral)

Each: **what to look for** · **per-language signals** · **severity** · **fix direction**.

## Injection
- **SEC-SQL** *(critical)* — String-built SQL. JS: template literals in `db.query(...)`; Python:
  f-strings/`%`-format in `cursor.execute(...)`. → Parameterize (`?`/named params).
- **SEC-INJECT** *(critical)* — Command/shell built from input. JS: `child_process.exec(userStr)`;
  Python: `os.system`/`subprocess` with `shell=True`. → Use arg arrays / `execFile`; allowlist.

## XSS
- **SEC-XSS** *(critical)* — Untrusted data into HTML. JS: `innerHTML`, `dangerouslySetInnerHTML`,
  `document.write`; templating with autoescape off. → Render as text; sanitize if HTML needed.

## Access control
- **SEC-AUTHN** *(critical)* — Non-public route without an auth check/middleware.
- **SEC-AUTHZ** *(critical)* — Object fetched by id without verifying caller ownership (IDOR);
  role checked only client-side. → Enforce ownership/role server-side per request.

## SSRF / CSRF
- **SEC-SSRF** *(high)* — Server fetches a user-controlled URL without an allowlist (`fetch(userUrl)`,
  `requests.get(userUrl)`). → Allowlist hosts/schemes; block internal/metadata IPs.
- **SEC-CSRF** *(high)* — State-changing route without CSRF token; cookie auth without `SameSite`.

## Deserialization
- **SEC-DESER** *(high)* — `pickle.loads`, `yaml.load` (unsafe), `JSON` into prototype-polluting paths.
  → Safe loaders (`yaml.safe_load`), fixed schemas, guard prototype pollution.

## Crypto
- **SEC-CRYPTO** *(critical)* — MD5/SHA1 for passwords; `Math.random()`/`random` for tokens; hardcoded
  key/IV. → bcrypt/argon2/scrypt; CSPRNG (`crypto.randomBytes`, `secrets`); authenticated encryption.

## Headers / cookies / config
- **SEC-HEADERS** *(high)* — Missing CSP/HSTS/`X-Content-Type-Options`/frame-ancestors.
- **SEC-COOKIE** *(high)* — Auth cookie without `Secure`/`HttpOnly`/`SameSite`.
- **SEC-CFG-CORS** *(high)* — `Access-Control-Allow-Origin: *` together with credentials.

## Validation / encoding / errors
- **SEC-INPUT** *(high)* — No server-side allowlist validation; trusting client checks.
- **SEC-ENCODE** *(critical)* — Output not contextually encoded (HTML/JS/URL).
- **SEC-ERRORS** *(medium)* — Stack traces returned to clients; secrets/PII in logs.
