# Secret & Insecure-Config Patterns (language-neutral)

Report values **redacted**. ruleId stem `SEC-SECRETS` unless noted.

## Hardcoded credentials/keys (critical)
| Signal | Example shape |
|---|---|
| Cloud keys | AWS `AKIA…`, GCP service-account JSON, Azure connection strings |
| Tokens/PATs | `ghp_…`, npm/PyPI tokens, Slack `xox…`, bearer tokens |
| DB URLs w/ password | `postgres://user:pass@host/db`, `mongodb+srv://…:…@…` |
| Private keys | `-----BEGIN … PRIVATE KEY-----`, `.pem`/`.p12` inline |
| Generic | `password = "…"`, `apiKey: "…"`, `.env` committed with real values |

## Config smells
- **SEC-CFG-DEBUG** *(high)* — debug/verbose errors enabled in production config.
- **SEC-CFG-CORS** *(high)* — wildcard CORS with credentials.
- **SEC-CFG-TLS** *(high)* — TLS verification disabled (`rejectUnauthorized:false`, `verify=False`).
- **SEC-CFG-SECRET-IN-REPO** *(critical)* — real secret committed instead of env/secret store.

## What NOT to flag
Placeholders in `.env.example`/docs (`<YOUR_TOKEN>`, `xxxx`), clearly-fake test fixtures.

## Fix direction
Move secrets to env / a secret manager; **rotate** anything committed (history retains it — removal
alone is insufficient).
