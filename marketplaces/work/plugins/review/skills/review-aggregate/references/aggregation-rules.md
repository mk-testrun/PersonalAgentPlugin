# Aggregation Rules (review-aggregate)

## Input
An array of `findings[]` from one or more review skills. Each finding follows
`docs/findings-schema.md` (`severity`, `area`, `ruleId`, `file`, `line`, `message`, `suggestion`).

## 1. Deduplicate
Key = `ruleId + "|" + file + "|" + line`.
- On collision: keep **one** finding with the **highest** severity (critical > high > medium > low > info).
- Merge provenance: union the contributing skills into a `sources[]` note; concatenate distinct `suggestion`s.

## 2. Sort
Primary: severity rank (critical=0 … info=4). Secondary: `area` (alphabetical). Tertiary: `file`, then `line`.

## 3. Gate flag
`gate = true` if any finding has severity `critical` or `high`. Gate ⇒ default recommendation
"do not merge"; the report header shows ❌ BLOCKED with counts, else ✅ PASS.

## 4. Top-N summary
Default N = 10. Take the first N after sorting (i.e. the most severe) for the executive summary.

## 5. Counts
Emit per-severity counts and per-area counts for the summary header and section badges.

## Determinism
Stable sort; deterministic dedupe key order — same input ⇒ same report (important for diffing reports).
