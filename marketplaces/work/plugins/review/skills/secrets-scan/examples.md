# secrets-scan — Worked Example

## Input: betterleaks JSON-Report (redigiert, mit Live-Validierung)

`evals/fixtures/betterleaks-sample.json` (verkürzt):

```json
[ {"RuleID":"aws-access-key","Description":"AWS Access Key ID","File":"src/config.cs","StartLine":12,
   "Commit":"abcdef1234567890","Validation":"active"},
  {"RuleID":"generic-api-key","Description":"Generic API Key","File":"src/config.cs","StartLine":12},
  {"RuleID":"private-key","Description":"Private Key","File":"keys/id_rsa","StartLine":1,"Validation":"unknown"} ]
```

## Kommando

```bash
node scripts/betterleaks-to-findings.mjs leaks.json history.json
```

## Output: findings[] (Werte redigiert, Live-Fund getaggt)

```json
[
  { "severity": "critical", "area": "security", "ruleId": "SECR-CLOUD",
    "file": "src/config.cs", "line": 12,
    "message": "aws-access-key: AWS Access Key ID [REDACTED] [LIVE — validated active] (commit abcdef12)",
    "suggestion": "Rotate the secret now, then purge it from git history (removal alone is insufficient — history retains it)." },
  { "severity": "critical", "area": "security", "ruleId": "SECR-SECRET",
    "file": "src/config.cs", "line": 12, "message": "generic-api-key: Generic API Key [REDACTED]", "suggestion": "…" },
  { "severity": "critical", "area": "security", "ruleId": "SECR-PRIVKEY",
    "file": "keys/id_rsa", "line": 1, "message": "private-key: Private Key [REDACTED]", "suggestion": "…" }
]
```

Beachte: **kein Klartext** — nur RuleID/Description/Ort/`[REDACTED]`. Der AWS-Key ist `[LIVE …]`, weil die
`validate`-Expression ihn bestätigt hat → **zuerst rotieren**.

## Schema-Selbstcheck

```bash
node scripts/betterleaks-to-findings.mjs leaks.json | node tools/validate-findings.mjs -
# → validate-findings: OK — 3 finding(s) valid.
```

## Nächster Schritt

Jeder Fund → **[GATE]** (critical). Für den AWS-Key: rotieren (IAM), dann History tilgen; erst danach
`.betterleaks.toml`-`filter` verfeinern, falls es ein bewusstes Test-Fixture war.
