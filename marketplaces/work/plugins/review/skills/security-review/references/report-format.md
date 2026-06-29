# Report Format (security-review)

## findings[] (machine-readable)
Per `docs/findings-schema.md`, `area: security`:
```json
{
  "severity": "critical|high|medium|low|info",
  "area": "security",
  "ruleId": "SEC-SQL",
  "file": "src/Data/OrderRepo.cs",
  "line": 42,
  "message": "User input concatenated into SQL via FromSqlRaw — SQL injection.",
  "suggestion": "Use FromSqlInterpolated or parameters: FromSqlInterpolated($\"... {id}\")."
}
```

## Human report (markdown)
```markdown
# Security Review — <scope> — <YYYY-MM-DD>

**Gate:** ❌ BLOCKED (2 critical, 1 high)   ← or ✅ PASS

## Executive summary
- SEC-SQL (critical) — SQL injection in OrderRepo.cs:42
- SEC-AUTHZ (critical) — IDOR in InvoiceController.cs:88
- SEC-COOKIE (high) — auth cookie missing HttpOnly/SameSite

## Findings
### 🔴 critical
- **SEC-SQL** `src/Data/OrderRepo.cs:42` — <message>
  - Fix: <concrete patch>
### 🟠 high
- …
```

## Rules
- **[GATE]** whenever ≥1 critical/high → default recommendation is "do not merge".
- Sort: critical → high → medium → low → info.
- Every finding includes a concrete, minimal fix.
- Secret values are redacted in both outputs.
