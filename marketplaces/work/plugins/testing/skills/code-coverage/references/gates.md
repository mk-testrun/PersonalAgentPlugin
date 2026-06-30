# Coverage Gates — thresholds & rationale

## Thresholds (defaults)
| Scope | Metric | Min | Why |
|---|---|---|---|
| Domain layer | branch | **80%** | Business rules carry the most risk; decision paths must be exercised. |
| Overall | branch | **70%** | Pragmatic floor across UI/infra where some paths are hard to unit-test. |

Override per project: `--overall N --domain N --domain-pattern <regex>`.

## Why branch, not line
Line coverage hides untested decisions: a fully "line-covered" `if` may never test its false branch.
Branch coverage counts each decision outcome, so it reflects real test thoroughness.

## How the domain layer is detected
Packages whose Cobertura `name` matches `--domain-pattern` (default `/Domain/i`). The gate uses the
**lowest** branch rate among matching packages (one weak domain assembly fails the gate). If nothing
matches, the domain gate is skipped (with a note) — set the pattern to your domain assembly name.

## Reading the result
- `overall.pass=false` → raise overall coverage; start with the lowest-covered packages in `packages[]`.
- `domain.pass=false` → the named domain package(s) under 80%; add tests for their untested branches.

## Gate policy
Any failing scope ⇒ **[GATE]** (default recommendation: do not merge). Coverage is a floor, not a
target — 100% is not the goal; meaningful tests on risky branches are.
