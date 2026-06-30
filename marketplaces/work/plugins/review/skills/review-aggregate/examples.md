# Examples — review-aggregate

## Input (findings from two skills, one duplicate)
```json
[
  {"severity":"high","area":"security","ruleId":"SEC-COOKIE","file":"src/Auth.cs","line":20,"message":"Auth cookie missing HttpOnly","source":"security-review"},
  {"severity":"critical","area":"security","ruleId":"SEC-SQL","file":"src/Data/OrderRepo.cs","line":42,"message":"SQL injection","source":"security-review"},
  {"severity":"medium","area":"sql","ruleId":"SQL-INDEX","file":"src/Data/OrderRepo.cs","line":55,"message":"Missing index","source":"sql-review"},
  {"severity":"high","area":"security","ruleId":"SEC-SQL","file":"src/Data/OrderRepo.cs","line":42,"message":"SQLi (dup)","source":"owasp-scan"}
]
```

## Run the deterministic merge
```bash
node scripts/aggregate.mjs evals/fixtures/findings-sample.json --top 10
```

## Output (excerpt)
```json
{
  "gate": true,
  "counts": { "critical": 1, "high": 1, "medium": 1, "low": 0, "info": 0 },
  "byArea": { "security": 2, "sql": 1 },
  "findings": [
    { "severity": "critical", "ruleId": "SEC-SQL", "file": "src/Data/OrderRepo.cs", "line": 42,
      "sources": ["security-review", "owasp-scan"] },
    { "severity": "high", "ruleId": "SEC-COOKIE", "file": "src/Auth.cs", "line": 20 },
    { "severity": "medium", "ruleId": "SQL-INDEX", "file": "src/Data/OrderRepo.cs", "line": 55 }
  ]
}
```

The duplicate `SEC-SQL` was merged (kept **critical**, sources combined), output sorted
critical→high→medium, and `gate=true` because a critical/high exists. Render the human report and
HTML from this object per `references/report-rendering.md`.
