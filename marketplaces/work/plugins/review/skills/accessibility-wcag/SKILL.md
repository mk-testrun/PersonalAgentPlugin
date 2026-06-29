---
name: accessibility-wcag
description: >-
  Runs a WCAG 2.2 accessibility audit (level A/AA/AAA, AA default) of a local web app using Playwright +
  axe-core, then reasons beyond axe for criteria tools can't auto-detect (focus order, meaningful alt
  text, error identification). Use when asked to check accessibility, run a WCAG/a11y audit, fix
  contrast/keyboard/ARIA issues, or prepare for BFSG. Produces findings[] (area:wcag) with per-criterion
  pass/fail and concrete fixes; localhost only.
mcp_tools:
  - playwright
---

# WCAG 2.2 Audit

Automated axe-core scan plus human-style review of the criteria automation misses — the combination
is what catches real barriers.

## When to Use This Skill

- "Run an accessibility / WCAG / a11y audit" · "is this page accessible?"
- Fixing contrast, keyboard, focus, ARIA, or form-labeling issues
- Preparing evidence for BFSG (then chain `accessibility-bfsg`)

## Parameters

- Target level: A · **AA** (default) · AAA
- Target: `http://localhost:*` (localhost only — Tool-Guardian)

## Workflow

### Step 1 — Scan
Open the URL in Playwright, run axe-core, collect violations with their WCAG criterion + impact.

### Step 2 — Reason beyond axe
Axe catches ~30–40% of WCAG issues. Manually check the criteria in
**[references/wcag-criteria.md](references/wcag-criteria.md)** that need human judgment (focus order,
alt-text meaningfulness, error identification, reflow, target size).

### Step 3 — Classify
Per criterion: Pass / Fail / N/A, grouped by level (A, AA, AAA). Map axe `impact`
(critical/serious/moderate/minor) to finding severity.

### Step 4 — Fix
Each Fail gets a concrete, minimal fix (markup/ARIA/CSS).

## Output

`findings[]` (`area: wcag`, ruleId = WCAG criterion e.g. `WCAG-1.4.3`), per-criterion result, and
fixes. Severity from impact; critical/serious → **[GATE]**. For the legal BFSG mapping + statement,
chain **accessibility-bfsg**.
