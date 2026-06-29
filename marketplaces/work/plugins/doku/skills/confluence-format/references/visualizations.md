# Confluence Visualization Options

Pick the lightest element that conveys the intent.

| Goal | Element |
|---|---|
| Draw attention to a hint/risk | **Panel** (info/note/warning/tip) |
| Show a state (ADR/ticket/review) | **Status lozenge** (coloured) |
| Compare options / decision matrix | **Table** (+ `ac:layout` for wide) |
| Hide long logs/optional detail | **Expand** macro |
| Navigate a doc space | **Page Tree** / `children` macro |
| Show a diagram | **Mermaid/Draw.io macro** (if installed) **or** image as **attachment** |
| Page outline | **TOC** macro on top |

## Diagrams — two paths
1. **Macro** (if the space has the Mermaid/Draw.io app): embed the source in the macro body.
2. **Attachment** (always works): render the diagram (e.g. via `doku/diagram-embed` from
   experimental Mermaid), upload as attachment, embed with `ri:attachment`.

## Status conventions (reuse everywhere)
Proposed → Grey · In Review → Yellow · Accepted → Green · Deprecated → Red.

## Don't
- Don't simulate panels with bold text or emoji-only.
- Don't paste external image URLs (may break / leak); attach instead.
