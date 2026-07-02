# Agent-Loop Protocol

## State file — `state/loop/<id>.json`
```json
{
  "id": "a1b2",
  "goal": "Make the unit test suite pass",
  "successCriterion": "dotnet test exits 0",
  "maxIterations": 5,
  "iteration": 2,
  "status": "running",            // running | success | stopped
  "stopReason": null,             // success | limit | blocker | no-progress | abort
  "history": [
    { "n": 1, "plan": "Fix null check in OrderService", "result": "3 failing -> 1 failing", "progress": true },
    { "n": 2, "plan": "Handle empty cart", "result": "1 failing -> 0 failing", "progress": true }
  ]
}
```
Write it after every round. `progress` = did the measured criterion move closer?

## State machine
```
setup → [iterate]──met?──yes─→ success(stop)
            │  no
            ├─ iteration >= max ───────→ stop(limit)
            ├─ unrecoverable blocker ──→ stop(blocker)
            ├─ 2× no progress ─────────→ stop(no-progress)
            └─ else: persist, n++ , [iterate]
user abort at any point ────────────────→ stop(abort)
```

## Stop-conditions (detail)
- **success** — criterion measured true.
- **limit** — `iteration == maxIterations` and not met.
- **blocker** — needs something the loop can't get (credentials, broken env, out-of-scope change).
- **no-progress** — two consecutive rounds where the measured criterion didn't improve. Don't vary endlessly.
- **abort** — user stops it.

## Verification must be measured
Run the actual check each round (tests/build/review). Never assume. Prefer existing skills:
`testing/dotnet-test-run`, `testing/code-coverage`, `review` skills.

## Final report
```
Loop <id> — <stopReason>
Goal: <goal>
Criterion: <met / not met> (<measured result>)
Iterations: <n>/<max>
Next steps (if not solved): <…>
```

## Guardrails
- Mutating actions: **[CONFIRM]** each (work context).
- Never raise `maxIterations` mid-run to "keep going".
- Never redefine the success criterion to declare victory.
