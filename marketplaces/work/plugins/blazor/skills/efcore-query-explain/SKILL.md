---
name: efcore-query-explain
description: >-
  Analyzes an EF Core LINQ query for its SQL translation and performance traps — client evaluation,
  N+1 from lazy loading, cartesian explosion from multiple collection Includes, over-fetching, and
  missing AsNoTracking. Use when asked why an EF Core query is slow, what SQL it generates, whether it
  causes N+1, or to optimize a LINQ/DbContext query. Read-only analysis; produces concrete before/after
  rewrites. Index suggestions → efcore-index-suggest; compiled queries → efcore-compiled-query-suggest.
---

# EF Core Query Explain

Understand what a LINQ query actually does against the database and find the performance traps before
they hit production. Read-only: it explains and rewrites, it never changes the schema.

## When to Use This Skill

- "Why is this query slow?" / "What SQL does this generate?"
- Suspected N+1, cartesian explosion, or client-side evaluation
- Optimizing a specific LINQ/`DbContext` query before adding indexes

## How It Works

1. Make the SQL visible (`ToQueryString()` / `LogTo`).
2. Check the whole query translates server-side (no client eval).
3. Trace navigations to spot N+1 and Include explosions.
4. Propose a concrete before/after rewrite.

## Workflow

### Step 1 — Surface the SQL
`query.ToQueryString()` (or `LogTo`/`EnableSensitiveDataLogging` locally only).

### Step 2 — Translation & traps
Walk **[references/translation-pitfalls.md](references/translation-pitfalls.md)**: client evaluation,
cartesian explosion (`AsSplitQuery`), over-fetching (projection), missing `AsNoTracking`, late
materialization.

### Step 3 — N+1
Apply **[references/n-plus-one-patterns.md](references/n-plus-one-patterns.md)** to find navigation
access inside loops and the Include/projection fix.

### Step 4 — Rewrite
Give a minimal before/after snippet + the resulting SQL shape.

## Output

Findings (ruleId `EFQ-*`, `area: performance`) + generated SQL + concrete before/after rewrite.
Read-only — no migration or DB change. For indexes: `efcore-index-suggest`.
