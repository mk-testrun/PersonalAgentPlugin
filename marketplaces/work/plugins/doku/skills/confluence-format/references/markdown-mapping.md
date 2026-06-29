# Markdown → Confluence Storage-Format Mapping

| Markdown | Confluence storage |
|---|---|
| `# H1 … ###### H6` | `<h1>…<h6>` — but do **not** repeat the page title as H1; start at `<h2>` |
| ` ```lang … ``` ` | `code` macro with `<ac:parameter ac:name="language">` + `<![CDATA[ … ]]>` |
| `> blockquote` / hint | panel macro (`info`/`note`/`warning`/`tip`) — not a literal `>` |
| `**bold**` / `*italic*` | `<strong>` / `<em>` |
| `- item` / `1.` | `<ul><li>` / `<ol><li>` |
| `- [ ] task` | `<ac:task-list><ac:task><ac:task-status>incomplete</…>` |
| table | real `<table>` (see storage-format-macros.md) |
| `[text](url)` | `<a href="url">text</a>`; internal page → `<ac:link><ri:page ri:content-title="…"/></ac:link>` |
| image | upload as attachment, then `<ac:image><ri:attachment ri:filename="…"/></ac:image>` |
| `---` rule | `<hr/>` |
| inline `code` | `<code>…</code>` |

## Pitfalls
- Raw `<`/`>`/`&` in body text must be XML-escaped; code goes in `CDATA`.
- Markdown auto-links don't translate — emit explicit `<a>`/`<ac:link>`.
- Nested lists: close inner `<ul>`/`<ol>` correctly (storage format is strict XHTML).
