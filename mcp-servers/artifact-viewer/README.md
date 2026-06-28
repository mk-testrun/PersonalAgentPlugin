# artifact-viewer

Universal renderer MCP server for GitHub Copilot CLI. Renders any format with a **Rich mode** (interactive MCP-UI-Resource in VS Code Webview) and a **guaranteed Fallback** (inline text + clickable `file://` link).

## Tools

| Tool | Input | Rich | Fallback |
|---|---|---|---|
| `render_markdown` | content / source | HTML webview | Formatted text inline |
| `render_html` | content / source | Webview | Text summary + link |
| `render_mermaid` | content / source | HTML + mermaid.js | Source inline + link |
| `render_diagram` | content / source | Alias for render_mermaid | — |
| `render_qr` | content (text/URL) | SVG webview | **QR Unicode block** + PNG link |
| `render_image` | source (file path) | Image in webview | Metadata + link |
| `render_pdf` | source (file path) | iframe embed | Page count + text + link |
| `render_docx` | source (file path) | HTML via mammoth | Plain text extract + link |
| `render_3d` | source (GLB/glTF) | `<model-viewer>` | Metadata + link |
| `play_audio` | source (file path) | `<audio>` webview | Metadata + link (OS player) |
| `play_video` | source (file path) | `<video>` webview | Metadata + link (OS player) |

## Caveat

Whether PDF/3D/Video render **inline** depends on the client (VS Code Webview, other MCP hosts).
The fallback (inline text + clickable link) is always the guaranteed path.

## Configuration

| ENV | Values | Default |
|---|---|---|
| `VIEWER_RICH` | `auto` \| `on` \| `off` | `auto` |
| `VIEWER_OUT` | Directory path | `.copilot/state/artifacts` |

`auto`: rich mode active; client decides whether to render the MCP-UI-Resource.
`off`: always use fallback — useful for non-visual clients and tests.

## Build & Test

```bash
npm run build   # tsc
npm test        # fallback.test.mjs (VIEWER_RICH=off)
```

## MCP Wiring

```json
{
  "mcpServers": {
    "artifact-viewer": {
      "command": "artifact-viewer",
      "env": { "VIEWER_RICH": "auto" }
    }
  }
}
```
