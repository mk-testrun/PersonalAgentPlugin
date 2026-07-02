# workflow-router — Referenz

## §1 Warum ein Skript statt Prompt-Choreografie

Früher lebte die Schritt-Logik nur in den Command-Prompts + im Agent-Body → **Prompt-Drift**: jeder Lauf
konnte Schritte anders reihen, vergessen oder Gates überspringen. Jetzt sind die Schritte in
`scripts/run-state.mjs` **fest kodiert** (die `WORKFLOWS`-Map). Der Agent liest Plan und „nächsten
Schritt" aus dem Skript — er erfindet sie nicht. Der persistierte State macht Läufe **resumebar**.

## §2 Delegations-Matrix (vollständig)

| Delegat | Zuständig für |
|---|---|
| `general` | Issue/Work-Item auflösen, Branch, Commit, PR, Merge, Pipeline-Konventionen |
| `blazor` | .NET/Blazor-Implementierung, EF-Core, Roslyn (sharplens) |
| `testing` | Unit-Tests, Coverage-Gate, E2E-Playwright (localhost) |
| `review` | Review-Matrix (OWASP/WCAG/BFSG/SQL/Deps/Perf), findings[], Gate |
| `doku` | Confluence-Doku, Code→Doc, product-functions |
| `experimental` | loop (iteratives Nacharbeiten), ADR-Record |

Der Orchestrator-Agent ruft diese über den `agent`-Tool bzw. die jeweiligen Skills auf — er schreibt
**nie** selbst Produktionscode.

## §3 Workflow-Schritte (Quelle: run-state.mjs)

Diese Tabellen spiegeln die kodierten Schritte. Änderungen **immer im Skript** machen, dann hier
nachziehen (das Skript ist die Wahrheit).

### feature — Issue → Branch → Impl → Tests → Review → PR
1. resolve · general · [CONFIRM]
2. branch (idempotent, `feature/AB-<id>-<slug>`) · general · [CONFIRM]
3. implement · blazor · [CONFIRM]
4. unit + Coverage-Gate · testing
5. e2e (localhost, opt-in) · testing · [GATE]
6. review (diff-scoped) · review · [GATE]
7. pr + Work-Item · general · [CONFIRM]
8. doc (optional) · doku · [CONFIRM]

### bugfix — Repro → Failing-Test → Fix → grün → Review → PR
repro·[CONFIRM] → branch·[CONFIRM] → failtest → fix·[CONFIRM] → green·[GATE] → review·[GATE] → pr·[CONFIRM]

### review-flow — nur prüfen
scope → matrix → aggregate·[GATE]

### ship — merge-bereiten PR ausliefern (nur Work)
preflight → review·[GATE] → merge·[CONFIRM] → pipeline·[GATE]

### plan — Vorhaben zerlegen (kein Code)
clarify·[CONFIRM] → decompose → record (ADR)·[CONFIRM]

## §4 Gates & Marker

- **[CONFIRM]** — vor einem **mutierenden** Schritt (Branch, Code, PR, Merge) Ja/Nein einholen.
- **[GATE]** — nach einem prüfenden Schritt: bei `critical`/`high` **hart stoppen**, nicht `advance`en.
  Der Lauf bleibt an diesem Schritt stehen (`status: pending`), bis der Befund behoben ist.
- `advance --status blocked` hält den Workflow bewusst an (z. B. externe Abhängigkeit).

## §5 State-Datei

`state/artifacts/orchestrator-<workflow>-<runId>.json`:
```json
{ "workflow": "feature", "runId": "20260702-055917", "title": "…",
  "steps": [ { "id":"resolve","title":"…","delegate":"general","gate":"confirm","status":"done" }, … ],
  "cursor": 3 }
```
`status` je Schritt: `pending|done|blocked|skipped`. `resume` liest den ersten `pending`. Nie zweimal
ausführen — der State ist die Quelle des Fortschritts.

## §6 Abbruch / Rollback

Bricht der Nutzer nach `branch` ab: **[CONFIRM]** „Branch wieder löschen?" (§2.8). Der State bleibt
liegen und kann später per `resume` fortgesetzt werden.
