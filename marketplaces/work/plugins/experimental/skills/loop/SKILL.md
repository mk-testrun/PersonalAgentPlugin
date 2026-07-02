---
name: loop
description: >-
  Runs a controlled agent loop — iterating Plan→Act→Verify→Decide toward an objective until a
  measurable success criterion is met or a hard iteration limit is hit, with state persisted between
  rounds. Use only on an explicit /loop trigger when a task needs repeated attempts (e.g. "keep fixing
  until tests pass", "iterate until the gate is green"). Enforces a hard limit, stop-conditions, and a
  final report. Never auto-starts.
---

# Agent Loop

Repeats one disciplined cycle toward a goal instead of producing a single answer. Discipline is the
whole point: without a success criterion and a hard limit it becomes an expensive infinite loop.

## When to Use This Skill

- Explicit `/loop <goal>` only — never automatically
- Tasks that genuinely need iteration: "fix until `dotnet test` is green", "drive the gate to pass"
- Bounded autonomous refinement with a checkable end state

## Mandatory Setup (before iteration 1)

1. **Goal** — one sentence.
2. **Success criterion** — objective & checkable (tests green, 0 high findings, build+lint clean).
3. **Hard limit** — `max_iterations` (default 5, hard). Reaching it = **stop**.
4. **Loop id + state file** — `state/loop/<id>.json` (see
   **[references/protocol.md](references/protocol.md)** for the schema and the full state machine).

## Per-Iteration Cycle

| Phase | Action |
|---|---|
| **Plan** | Smallest sensible next change (one thing). |
| **Act** | Make exactly that change — mutating actions require **[CONFIRM]**. |
| **Verify** | Measure the success criterion (run tests/build/review). Result is fact, not assumption. |
| **Decide** | Met → **stop (success)**. Else record learning, increment, next round. |

Persist state after every round.

## Stop-Conditions (any ends the loop)

✅ success · 🛑 limit reached · ❌ unrecoverable blocker · 🔁 two rounds with no measurable progress ·
⏹️ user abort. Details and the report format are in **[references/protocol.md](references/protocol.md)**.

## Output

A final report: stop reason · state vs criterion · iterations used · recommended next steps if not
solved. The state file remains for traceability.

## Rules

- Explicit trigger only. Reuse existing skills/agents for the work (e.g. `testing/dotnet-test-run`,
  `review` skills for verification) instead of reimplementing.
- Never exceed the hard limit. Never weaken the success criterion to appear "done".
