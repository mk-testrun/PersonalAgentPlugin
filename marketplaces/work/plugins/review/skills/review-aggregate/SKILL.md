---
name: review-aggregate
description: >-
  Combines the findings[] of the individually-run review skills into ONE deduplicated, severity-sorted
  report with an executive summary, per-area sections, a merge gate, and an interactive HTML filter UI.
  Use after running one or more review skills, when asked for "the full review", "aggregate the
  findings", "overall security/quality report", or via /review-full. Finds nothing itself — it
  consolidates. Sets [GATE] when any critical/high finding is present.
---

# Review Aggregate

The **verbund** skill: it collects the `findings[]` produced by the individually-run review skills
and renders a single, polished report. It does not scan code itself — each domain skill stays
independently runnable; this one consolidates their output.

## When to Use This Skill

- After running ≥1 review skill, to produce one combined report (`/review-full`, "review all")
- When asked for an executive summary / overall gate decision across domains
- To render the interactive HTML report with severity/area/text filters

## Workflow

### Step 1 — Collect & validate
Gather the `findings[]` arrays from every review skill that ran (schema: `docs/findings-schema.md`).
Self-check the merged input before aggregating:
```bash
node tools/validate-findings.mjs <findings.json>
```
Fix any schema problems it reports, then continue.

### Step 2 — Aggregate (run the script — deterministic, low freedom)
Don't merge by hand. Run the bundled utility:
```bash
node scripts/aggregate.mjs <findings.json> --top 10
```
It dedupes by `ruleId+file+line` (keeps highest severity, merges source skills), sorts by severity →
area → file, computes the gate flag, and emits `{ gate, counts, byArea, top, findings }`. Rules:
**[references/aggregation-rules.md](references/aggregation-rules.md)**; worked example: **[examples.md](examples.md)**.

### Step 3 — Render
Produce both outputs per **[references/report-rendering.md](references/report-rendering.md)**:
Markdown (`state/reports/review-<date>.md`) and interactive HTML
(`state/reports/review-<date>.html`) with Severity / Area / free-text filters.

### Step 4 — Gate
If the gate flag is set (≥1 critical/high), emit **[GATE]** with a one-line blocking summary;
default recommendation "do not merge".

## Output

The aggregated `findings[]` + gate flag, plus the MD and HTML report paths. Executive summary first,
then per-area sections (security · accessibility · performance · sql · deps · design · pipeline · env),
then the full detail table.

### SARIF export (optional, für Tool-Interop)

Für GitHub Code Scanning / ADO / SARIF-Viewer die aggregierten findings zusätzlich als SARIF 2.1.0 exportieren:

```bash
node tools/findings-to-sarif.mjs state/reports/findings.json --out state/reports/review-<date>.sarif
```

Mapping: critical/high → error · medium → warning · low/info → note (Original-Severity bleibt in
`properties.severity`).
