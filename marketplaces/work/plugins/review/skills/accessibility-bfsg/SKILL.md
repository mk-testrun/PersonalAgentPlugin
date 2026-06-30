---
name: accessibility-bfsg
description: >-
  Maps WCAG 2.2 audit findings to German accessibility law (BFSG / BITV 2.0 / EN 301 549) and generates
  the legally required "Erklärung zur Barrierefreiheit" (§12 BFSG). Use after a WCAG audit when asked
  about BFSG/BITV conformance, the accessibility statement, or legal accessibility for a German B2C
  service. Produces findings[] (area:accessibility, BFSG-*) plus the statement as a Markdown artifact.
---

# BFSG / BITV Mapping & Statement

Turns a technical WCAG audit into the legal view German law requires: a conformance status and the
publishable "Erklärung zur Barrierefreiheit". Prerequisite: WCAG findings from `accessibility-wcag`.

## When to Use This Skill

- "Are we BFSG/BITV compliant?" · "generate the accessibility statement"
- Preparing legal evidence for a German public-facing B2C service (BFSG, in force 28.06.2025)

## Workflow

### Step 1 — Take the WCAG findings
Use the AA results from `accessibility-wcag` (run it first if not done).

### Step 2 — Map to BITV/EN 301 549
Apply **[references/bitv-mapping.md](references/bitv-mapping.md)**: each AA fail → a non-conformance;
derive the conformance status (vollständig / teilweise / nicht konform).

### Step 3 — Generate the statement
Fill **[references/erklaerung-template.md](references/erklaerung-template.md)** from the mapped results
(status, non-accessible content + criteria + dates, feedback contact, enforcement reference).

## Checklist (→ findings[], area: accessibility, ruleId BFSG-*)

1. **BFSG-MAP** — every WCAG-AA fail mapped to a BITV non-conformance. *(severity from WCAG impact)*
2. **BFSG-SCOPE** — in-scope service clarified (B2C, exceptions). *(info)*
3. **BFSG-CONFORM** — status justified and consistent with the audit. *(high if "nicht konform")*
4. **BFSG-FEEDBACK** — feedback mechanism + contact present. *(medium)*
5. **BFSG-ENFORCE** — enforcement/Schlichtungsstelle reference present. *(low)*

## Output

`findings[]` (`area: accessibility`, `BFSG-*`) **plus** the finished "Erklärung zur Barrierefreiheit"
as a Markdown artifact in `state/artifacts/`. Optional Confluence publish via `doku/confluence-draft`
+ **[CONFIRM]**. On critical/high → **[GATE]**.
