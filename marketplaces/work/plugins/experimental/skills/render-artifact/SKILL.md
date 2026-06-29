---
name: render-artifact
description: Nutze wenn du ein Artefakt (MD/HTML/Mermaid/QR/Bild/PDF/Docx/3D/Audio/Video) anzeigen oder abspielen willst. Delegiert an artifact-viewer-MCP — rich (VS Code Webview) oder Fallback (inline Text + klickbarer file://-Link).
---

Universelle Anzeige über den `artifact-viewer`-MCP-Server (§N1).

**Unterstützte Formate:**
| Format | Tool | Rich | Fallback |
|---|---|---|---|
| Markdown | `render_markdown` | HTML Webview | Text inline |
| HTML | `render_html` | Webview | Text-Zusammenfassung |
| Mermaid | `render_mermaid` | mermaid.js Webview | Quelltext + Link |
| QR-Code | `render_qr` | SVG Webview | Unicode-Block + PNG-Link |
| Bild | `render_image` | Bild in Webview | Metadaten + Link |
| PDF | `render_pdf` | iframe (client-abhängig) | Seitenanzahl + Link |
| DOCX | `render_docx` | HTML via mammoth | Text-Extrakt + Link |
| 3D (GLB/glTF) | `render_3d` | `<model-viewer>` | Metadaten + Link |
| Audio | `play_audio` | `<audio>` | Metadaten + Link (OS-Player) |
| Video | `play_video` | `<video>` | Metadaten + Link (OS-Player) |

**Verhalten:**
- Erkennt Format aus Dateiendung oder Inhalt automatisch
- Ruft passenden `artifact-viewer`-Tool auf
- Link ist **immer** vorhanden (auch im Rich-Modus)
- `VIEWER_RICH=auto` (Client entscheidet)

**Hinweis:** Keine externen Netzaufrufe durch artifact-viewer. CDN-Allowlist bleibt gültig.

Artefakt-Speicherort: `.copilot/state/artifacts/`
