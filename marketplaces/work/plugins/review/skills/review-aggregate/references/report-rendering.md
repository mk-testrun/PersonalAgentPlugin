# Report Rendering (review-aggregate)

Two artifacts, same data.

## Markdown — `state/reports/review-<date>.md`
```markdown
# Review Report — <scope> — <YYYY-MM-DD>

**Gate:** ❌ BLOCKED (2 critical · 3 high · 5 medium)   ← or ✅ PASS

## Executive summary (Top 10)
1. SEC-SQL (critical) src/Data/OrderRepo.cs:42 — SQL injection
2. …

## By area
### security (5)
- 🔴 **SEC-SQL** `OrderRepo.cs:42` — <message> · _fix:_ <suggestion>
### accessibility (3)
- …

## All findings
| sev | area | ruleId | location | message |
|-----|------|--------|----------|---------|
```

## HTML — `state/reports/review-<date>.html`
Single self-contained file (CDN-allowlist only). Requirements:
- **Filter UI:** severity dropdown, area dropdown, free-text search box — filter the rows live (vanilla JS).
- **Severity colouring:** critical 🔴 high 🟠 medium 🟡 low ⚪ info ⓘ.
- **Sticky gate banner** at top (BLOCKED/PASS + counts).
- Data embedded inline as `const findings = [...]`; table rendered from it; no external calls.
- Accessible: semantic table, `lang`, sufficient contrast, keyboard-focusable controls.

## Both
- Sorted per `references/aggregation-rules.md`.
- Every finding shows its concrete fix (`suggestion`).
- Paths use forward slashes.
