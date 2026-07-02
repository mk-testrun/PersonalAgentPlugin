# templates/ — Kopiervorlagen

| Template | Zweck |
|---|---|
| `repo-starter/` | Neues Repo sofort agent-ready: AGENTS.md, Copilot-Instructions, `.editorconfig`, CI, `.mcp.json`-Stub |
| `marketplaces/work/plugins/meta/skills/mcp-author/templates/dotnet-starter/` | .NET-MCP-Server-Scaffold (liegt beim mcp-author-Skill) |

## repo-starter benutzen

```bash
cp -r templates/repo-starter/. /pfad/zum/neuen-repo/
cd /pfad/zum/neuen-repo
git init && git add -A && git commit -m "Initial commit from repo-starter"
```

Danach die `TODO:`-Marker in `AGENTS.md`, `README.md` und
`.github/copilot-instructions.md` füllen. Die `.editorconfig` ist identisch mit der
des Monorepos — Änderungen dort bitte hierher spiegeln (Check: CI-Job `templates`).
