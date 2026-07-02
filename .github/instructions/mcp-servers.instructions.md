---
applyTo: "mcp-servers/**"
---

# Custom-MCP-Server (npm-Workspaces)

- Jeder Server ist ein eigener Workspace mit `package.json`, `README.md`, `test/` und
  (bei TypeScript) `tsconfig.json`. Konventionen: ADR-0005.
- Node-ESM oder TypeScript; **keine externen Netzaufrufe**, außer der Server-Zweck ist genau das
  (dann im README dokumentieren und Endpunkte nennen).
- Tests sind Plain-Node (`node --test` oder direkt ausführbare `*.test.mjs`) — keine neuen
  Test-Frameworks einführen.
- Ein neuer Server wird verdrahtet über: Workspace in `package.json` (Glob deckt ihn ab),
  Eintrag in CI (build/test läuft über `--workspaces`), Referenz per **Binärname** in den
  Plugin-`.mcp.json`, Zeile in ARCHITECTURE §3.
- State gehört unter `.copilot/state/` (gitignored), niemals ins Repo.
