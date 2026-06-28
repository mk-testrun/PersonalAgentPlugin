---
name: mcp-app-author
description: Nutze wenn du eine Viewer-/UI-MCP-App nach dem artifact-viewer-Muster scaffolden willst — rich (MCP-UI-Resource) + garantierter Fallback (inline Text + file://-Link) nach §2.7.
---

Scaffold eine MCP-App (Viewer/UI) nach dem `artifact-viewer`-Muster (§2.7).

**Pflicht-Muster (Rich + Fallback):**
Jedes Tool entscheidet per `VIEWER_RICH` ENV:
```typescript
if (isRich()) {
  // MCP-UI-Resource: { type: 'resource', resource: { uri, mimeType, text: htmlString } }
  // IMMER auch file:// Link zurückgeben
} else {
  // Fallback: { type: 'text', text: inlineText + '\n\n📄 file://...' }
}
```

**Garantierter Fallback-Contract:**
- Fallback-Modus MUSS Text + `file://`-Link liefern
- Rich-Modus KANN MCP-UI-Resource liefern (Client-abhängig)
- `file://`-Link ist immer vorhanden (auch im Rich-Modus)
- Keine externen Netzaufrufe im Server selbst

**Verzeichnisstruktur:**
```
mcp-servers/<name>/
├── src/
│   ├── index.ts       # Tools via McpServer
│   ├── fallback.ts    # isRich(), saveArtifact(), toContent()
│   └── renderers/     # Je Format ein File
├── test/
│   └── fallback.test.mjs   # VIEWER_RICH=off → Text + link
└── README.md
```

**Artefakt-Speicherort:** `${VIEWER_OUT:-.copilot/state/artifacts}`

**Test-Pflicht:** `VIEWER_RICH=off` → jeder Renderer liefert Text + `file://`-Link (keine Netzaufrufe).

Referenz-Implementierung: `mcp-servers/artifact-viewer/`
