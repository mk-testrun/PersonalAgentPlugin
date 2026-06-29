---
name: e2e-codegen
description: >-
  Generates persistent, committed Playwright spec files (e2e/*.spec.ts) from a described or recorded
  user flow, so the tests run in CI token-free (plain `playwright test`, no LLM at runtime). Use when
  asked to write/generate end-to-end tests, turn a flow into a durable test, or add Playwright specs
  to a project. Emphasizes stable role/testid selectors, fixtures, version pinning, and localhost-only
  targets. Distinct from e2e-playwright (runs tests) and e2e-pipeline-wire (CI stage).
---

# E2E Codegen

Produces **durable** Playwright test files that are committed and then run in CI **without any model**
— the opposite of one-shot exploration. Once generated and green, they are plain `playwright test`.

## When to Use This Skill

- "Write E2E tests for this flow / page / feature"
- Turning a `playwright codegen` recording into a maintainable, committed spec
- Adding regression coverage that runs token-free in CI

Not here: running existing tests → `e2e-playwright`; wiring the CI stage → `e2e-pipeline-wire`.

## Workflow

### Step 1 — Capture the flow
From a description or `playwright codegen http://localhost:*`. Identify the user-visible steps and the
success assertions (URL, visible text, element state).

### Step 2 — Generate the spec
Write `e2e/<feature>.spec.ts` following
**[references/selectors-and-structure.md](references/selectors-and-structure.md)** —
stable selectors (`getByRole`/`getByLabel`/`data-testid`), fixtures, auto-waiting (no `waitForTimeout`),
parametrization via `test.describe`.

### Step 3 — Pin & configure
Pin the Playwright version in `package.json`; ensure `playwright.config.ts` sets `baseURL`
(localhost) and a reporter. See **[references/ci-integration.md](references/ci-integration.md)**.

### Step 4 — Self-test once
Run the generated spec once locally (via `e2e-playwright`) until green, then it's commit-ready.

### Step 5 — Hand off to CI
Wire via `e2e-pipeline-wire`. After this, CI needs no model — just `playwright test`.

## Quality Bar (generated tests)

Deterministic (no time/order/randomness, no `sleep`) · isolated (own state + teardown) · meaningful
names (`feature_action_expectedResult`) · localhost-only target (Tool-Guardian).

## Output

Commit-ready `e2e/*.spec.ts` (+ `playwright.config.ts` if missing). Print paths; no auto-commit
without [CONFIRM].
