# Plugin → Use-Case Catalog (Work marketplace)

| Goal | Plugin(s) | Solo / Combination |
|---|---|---|
| ADO work-items, commits, git | `general` | solo (foundation) |
| Onboard a new developer | `onboarding` | solo |
| Build Blazor/.NET/EF code | `blazor` | with `testing` + `review` |
| Tests, coverage, E2E | `testing` | with `blazor` |
| Review code/security/quality | `review` | combination (acts as the gate) |
| Workflows /feature /bugfix | `orchestration` | calls `review`/`testing`/`doku`/`loop` |
| Confluence documentation | `doku` | solo or with `review` |
| Diagrams, slides, ADRs | `experimental` | solo |
| Build skills/plugins/MCP | `meta` | solo |
| Iterate to a checkable goal | `loop` | calls other plugins |

## Combination flows (the value is in the verbund)
- **Feature delivery:** `orchestration` → `blazor` (code) → `testing` (tests) → `review` (gate) → `doku` (docs).
- **Quality gate:** run individual `review` skills, then `review-aggregate` for one report + gate.
- **Iterate to green:** `loop` with success criterion "tests pass", delegating to `testing`.

## Reading installed vs available
`copilot plugin list` shows installed plugins; the marketplace lists all available ones. Recommend
only what the user's stated goal needs — not everything.
