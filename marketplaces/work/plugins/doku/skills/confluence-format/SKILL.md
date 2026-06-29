---
name: confluence-format
description: >-
  Produces idiomatic Confluence Storage Format (XHTML with ac:/ri: macros) — panels, code blocks,
  TOC, status lozenges, expands, tables — and maps Markdown to it correctly. Use when drafting or
  formatting Confluence pages, converting Markdown to Confluence, or choosing how to visualize
  content (panels, status, diagrams) in a wiki page. Feeds confluence-draft; it never publishes
  itself — publishing is always [CONFIRM] and within CONFLUENCE_SPACES.
---

# Confluence Format

Confluence stores pages as **Storage Format** (XHTML with `ac:`/`ri:` macros), not Markdown. This
skill produces correct storage-format building blocks and maps Markdown onto them. It only prepares
content; `confluence-draft` handles draft/publish (publish requires **[CONFIRM]**).

## When to Use This Skill

- Drafting or reformatting a Confluence page
- Converting Markdown (README, notes) into Confluence storage format
- Deciding how to present something in a wiki page (panel vs table vs status vs diagram)

## How It Works

1. Pick the right block for the intent (hint, code, comparison, status, collapsible detail).
2. Emit valid storage-format XHTML using the macro references below.
3. Hand the result to `confluence-draft`; never publish here.

## References

- **Macros & blocks** (panels, code, TOC, expand, status, tables) →
  **[references/storage-format-macros.md](references/storage-format-macros.md)**
- **Markdown → Confluence mapping** (headings, code fences, blockquotes, tasks, images) →
  **[references/markdown-mapping.md](references/markdown-mapping.md)**
- **Visualization options** (panels, status lozenges, diagrams via attachment/macro, page tree) →
  **[references/visualizations.md](references/visualizations.md)**

## Best Practices

1. Don't repeat the page title as an H1 in the body; structure with `<h2>`.
2. Every code block declares its `language` parameter.
3. Hints as panels, not bold paragraphs; long/optional content in `expand`; `toc` on top for scanability.
4. Images/diagrams: upload as attachment first, then reference via `ri:attachment`.
5. Consistent status lozenges for all decision/review states.

## Output

Valid Confluence storage-format XHTML (a fragment or full page body), ready for `confluence-draft`.
No publish; stay within `${env:CONFLUENCE_SPACES}`; PII anonymized via proxy.
