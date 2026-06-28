---
name: mcp-author
description: Nutze wenn du einen neuen Custom-MCP-Server scaffolden willst — TypeScript via @modelcontextprotocol/sdk oder .NET via dotnet-mcpserver-starter. Korrekte bin-/Workspace-Verdrahtung nach §2.4.
---

Scaffold einen neuen MCP-Server unter `mcp-servers/<name>/`.

**TypeScript-Template:**
```
mcp-servers/<name>/
├── package.json       # type: module, bin: { "<name>": "./dist/index.js" }
├── tsconfig.json      # target: ES2022, module: Node16
├── src/
│   └── index.ts       # McpServer + StdioServerTransport + server.tool(...)
├── test/
│   └── <name>.test.mjs
└── README.md
```

**Pflicht-Inhalt `package.json`:**
```json
{
  "type": "module",
  "bin": { "<binary-name>": "./dist/index.js" }
}
```

**.NET-Template (via dotnet-mcpserver-starter):**
```
mcp-servers/<name>/
├── <Name>.csproj     # net8.0, ModelContextProtocol
├── Program.cs        # Host.CreateApplicationBuilder + AddMcpServer()
└── Tools/<Name>Tools.cs   # [McpServerToolType] + [McpServerTool]
```

**§2.4 Wiring-Regel:** MCP-Server werden **immer** via Binärname referenziert:
```json
{ "command": "<binary-name>" }
```
Nie via relativer Pfad!

**Workspace-Eintrag:** Root `package.json` Workspaces enthält `mcp-servers/*` → automatisch.

**Nach dem Scaffold:**
1. `npm install` im Root
2. `npm run build` im Server-Verzeichnis
3. Tests grün
4. In `.mcp.json` des Ziel-Plugins eintragen
5. `marketplace-validate` ausführen
