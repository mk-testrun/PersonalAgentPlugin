---
mode: agent
description: "Neuen geteilten Custom-MCP-Server scaffolden (Workspace + Tests + Wiring)"
---

Scaffolde einen neuen Custom-MCP-Server unter `mcp-servers/<name>/` nach ADR-0005:

1. `package.json` (Workspace, `bin`-Eintrag = Servername), `README.md`, `src/`, `test/`,
   bei TypeScript `tsconfig.json` — orientiere dich an `mcp-servers/password-gen/`.
2. Keine externen Netzaufrufe; State nur unter `.copilot/state/`.
3. Mindestens ein Plain-Node-Test, der ohne Netz läuft.
4. Wiring: Referenz per **Binärname** in den passenden Plugin-`.mcp.json` (Welt beachten),
   Zeile in `ARCHITECTURE.md` §3, ggf. `profiles/<welt>/profile.json` ergänzen.
5. Lauf `npm install && npm run test:servers` und zeig mir das Ergebnis.
