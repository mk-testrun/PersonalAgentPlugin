---
name: adr-write
description: >-
  Creates an Architecture Decision Record as versioned repo Markdown (docs/adr/NNNN-slug.md), with the
  next number computed automatically by a bundled script. Use when asked to write/record an ADR, capture
  an architecture decision, or document a technical choice. ADRs live next to the code, not the wiki —
  no Confluence publish. Follow-up slides → presentation-from-adr.
---

# ADR Write

Record an architecture decision as a versioned Markdown file with consistent numbering.

## When to Use This Skill

- "Write/record an ADR" · "document this architecture decision" · "capture why we chose X"

## Workflow

### Step 1 — Compute number + scaffold (run the script — deterministic, read-only)
```bash
node scripts/next-adr.mjs --title "Use PostgreSQL for primary store" [--status Proposed] [--dir docs/adr]
```
Returns `{ number, slug, path, content }` — the next `NNNN`, the slug, target path, and a filled
template. It **does not write** any file.

### Step 2 — Fill the sections
Complete Kontext / Entscheidung / Begründung / Konsequenzen in the returned `content`.

### Step 3 — Write (after [CONFIRM])
Write the completed content to the returned `path`. ADRs are versioned repo artifacts — commit alongside
the code.

## Format

`# ADR NNNN: Titel` · **Status** (Proposed | Accepted | Deprecated) · **Datum** · Kontext · Entscheidung ·
Begründung · Konsequenzen.

## Output

A new `docs/adr/NNNN-<slug>.md` (written only after [CONFIRM]). No Confluence publish. For slides:
`presentation-from-adr`.
