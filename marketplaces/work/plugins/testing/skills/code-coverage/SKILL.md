---
name: code-coverage
description: >-
  Measures .NET test coverage with coverlet and decides the coverage gate deterministically from the
  Cobertura report (overall branch >= 70%, domain-layer branch >= 80%). Use when asked to check
  coverage, enforce a coverage gate, see if coverage dropped, or produce a coverage report. Runs a
  bundled script to parse the report and emit a pass/fail verdict; generates the HTML report via
  reportgenerator.
---

# Code Coverage

Measure coverage, then let a script decide the gate from the numbers — no eyeballing.

## When to Use This Skill

- "Check coverage" / "are we above the coverage gate?" / "did coverage drop?"
- Producing a coverage report + a merge gate decision
- Wiring a coverage gate into a pipeline

## Workflow

### Step 1 — Measure
```bash
dotnet test --collect:"XPlat Code Coverage"
```
Produces a Cobertura XML (`coverage.cobertura.xml`) per test project.

### Step 2 — Gate (run the script — deterministic)
```bash
node scripts/coverage-gate.mjs <coverage.cobertura.xml> --overall 70 --domain 80 --domain-pattern Domain
```
Exit 0 = gate passed, exit 1 = **[GATE] BLOCKED**. Output JSON has `overall`, `domain`, and per-package
rates. Thresholds & rationale: **[references/gates.md](references/gates.md)**.

### Step 3 — Human report
Generate the browsable HTML with reportgenerator:
```bash
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:state/reports/coverage -reporttypes:Html
```

### Step 4 — Decide
Gate failed → **[GATE]** with the failing layer/number and the lowest-covered packages to target first.

## Output

Gate verdict (pass/fail + numbers), the per-package breakdown, and the HTML report path. On a drop
below threshold → **[GATE]** (default "do not merge").

## Notes

- The script is **additive**: it parses the report you already produced; the skill's guidance stays here.
- Branch coverage (not line) is the gate — it reflects untested decision paths.
