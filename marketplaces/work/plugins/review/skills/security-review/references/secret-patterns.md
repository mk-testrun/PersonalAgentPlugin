# Secret & Insecure-Config Patterns (security-review)

Report any value **redacted** (never echo the secret). ruleId stem `SEC-SECRETS` unless noted.

## Hardcoded credentials/keys (critical)
| Signal | Example shape |
|---|---|
| Cloud keys | AWS `AKIA…`, Azure connection strings `…AccountKey=…`, GCP service-account JSON |
| Tokens/PATs | `ghp_…`, Azure DevOps PAT, Slack `xox…`, bearer tokens |
| DB connection w/ password | `Server=…;Password=…` in code/appsettings |
| Private keys | `-----BEGIN … PRIVATE KEY-----`, `.pfx`/`.pem` bytes inline |
| Generic | `password = "…"`, `apiKey: "…"` outside `.example` files |

## Config smells
- **SEC-CFG-DEBUG** *(high)* — `ASPNETCORE_ENVIRONMENT=Development`/detailed errors in prod config.
- **SEC-CFG-CORS** *(high)* — `AllowAnyOrigin()` combined with `AllowCredentials()`.
- **SEC-CFG-SSL** *(high)* — `ServerCertificateValidationCallback => true` / disabled TLS validation.
- **SEC-CFG-SECRET-IN-REPO** *(critical)* — Real secret in `appsettings*.json` instead of user-secrets/KeyVault/env.

## What NOT to flag
- Placeholders in `*.example`/docs (`<YOUR_TOKEN>`, `${secret:…}`, `xxxx`).
- Test fixtures clearly marked as fake.

## Fix direction
Move secrets to `dotnet user-secrets` / KeyVault / env; rotate anything that was committed (removal
alone is insufficient — history retains it; recommend `secrets-scan` for the history sweep).
