---
name: sql-review
description: >-
  Reviews SQL statements, EF-Core queries, and migrations for injection, parametrization, N+1, missing
  indexes, transaction boundaries, and migration safety. Use when reviewing SQL/migrations or a
  DbContext, when asked about query safety/performance at the data layer, or to check a migration before
  applying it. Produces findings[] (area:sql) with concrete before/after fixes; [GATE] on critical/high.
applyTo: ["**/*.sql", "**/Migrations/**", "**/*DbContext*.cs"]
---

# SQL & EF-Core Review

Data-layer correctness, safety, and performance. General .NET performance → `performance-review`;
query translation of one query → `blazor/efcore-query-explain`.

## When to Use This Skill

- Reviewing SQL files, EF-Core migrations, or a `DbContext`
- "Is this query safe/fast?" at the data layer
- Checking a migration for destructive/irreversible steps before applying

## Workflow

### Step 1 — Scope
Identify the SQL/migration/DbContext in scope (for a diff, the changed statements + reachable callees).

### Step 2 — Pattern pass
Walk **[references/sql-patterns.md](references/sql-patterns.md)** (ruleId · what to look for · bad→good
example · severity): injection, parametrization, N+1, index, select-*, transactions, migration safety,
NULL semantics, paging.

### Step 3 — Report
Each finding gets a concrete before/after fix.

## Output

`findings[]` (`area: sql`, ruleId `SQL-*`). Injection/parametrization → critical; N+1/transaction/
migration-safety → high; index/projection/paging/null → medium. On critical/high → **[GATE]**.
