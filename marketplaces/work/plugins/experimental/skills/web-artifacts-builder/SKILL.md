---
name: web-artifacts-builder
description: Nutze wenn eine portables single-file-HTML-Artefakt zu erstellen (CDN-Allowlist erzwungen).
---

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt als MCP-UI-Resource inline (VS Code Webview)
- **Fallback:** Mermaid-Quelltext / ASCII + Pfad zu state/artifacts/



## CDN-Allowlist

Nur Ressourcen aus `policy/cdn-allowlist.json` erlaubt.
Cowork-Bridge: `window.cowork.callMcpTool()` für Refresh.
