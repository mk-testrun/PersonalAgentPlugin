# Upstream-Katalog — referenzierte Top-Projekte

Was dieses Monorepo von außen bezieht, wo es verdrahtet ist und wie es aktuell gehalten wird.
Regel: **erst prüfen, dass ein Paket wirklich existiert** (ARCHITECTURE §7), dann verdrahten;
Adaptionen bekommen einen ADR.

## MCP-Server (Upstream)

| Server | Paket/Quelle | Verdrahtet in |
|---|---|---|
| github | GitHub MCP Server (offiziell) | home/general |
| playwright | `@playwright/mcp` (Microsoft) | work/review+testing (localhost), home/lab+reviewer (Internet) |
| context7 | `@upstash/context7-mcp` | work/blazor, home/general, repo-starter |
| filesystem / git / fetch / time | `@modelcontextprotocol/servers` (Referenz-Server) | beide Welten |
| memory | `@modelcontextprotocol/server-memory` | profiles/home (`mcpExtras`) |
| sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | profiles/home + profiles/work (`mcpExtras`) |
| ado | Azure-DevOps-MCP (Microsoft) — hinter anonymizer-proxy | work/general+doku |
| sharplens | `sharplens-mcp` (Roslyn) | work/blazor |
| chart | `@antv/mcp-server-chart` | work/experimental, home/visual |
| excalidraw | `excalidraw-mcp` | home/visual |
| imagegen | `imagegen-mcp` | home/visual |
| mermaid | `@narasimhaponnada/mermaid-mcp-server` | work/experimental, home/visual |
| chrome-devtools | Chrome-DevTools-MCP | work/general, home/lab |
| confluence / notion / brave-search / homeassistant / nuget | jeweilige Community-/Vendor-Server | siehe Plugin-`.mcp.json` |

## Skills / Patterns (adaptiert, nicht nur referenziert)

| Upstream | Was übernommen wurde | Wo |
|---|---|---|
| `mattpocock/skills` → git-guardrails | Guardrail-Policy + preToolUse-Hook, an Work/Home-Modi angepasst | ADR-0004, `general`-Plugins |
| `anthropics/skills` | Authoring-Stil (SKILL.md-Disziplin, progressive disclosure) | `docs/skill-authoring-guide.md` |
| `github/awesome-copilot` | Fundus für `.instructions.md`/`.prompt.md`-Muster | `.github/instructions/`, `.github/prompts/` |
| Copilot-CLI-Plugin-Spec (First-Party) | Validator prüft gegen die echte Spec | `tools/validate-plugins.mjs`, ADR-0007 |

## Pinning & Sync-Policy

1. **`npx -y` = latest.** Bewusste Entscheidung für die persönliche Nutzung (immer aktuell,
   null Wartung). Wird ein Server geschäftskritisch oder Work-seitig auditiert →
   Version pinnen (`@antv/mcp-server-chart@x.y.z`) und hier vermerken.
2. **Quartals-Check:** `/repo-health`-Prompt ausführen — er sucht u. a. tote Paket-Referenzen.
3. **Neue Upstream-Kandidaten** zuerst hier eintragen (mit Existenz-Beleg), dann verdrahten.
4. **Adaptionen** (kopierter/abgewandelter Code statt Paket-Referenz) brauchen einen ADR
   mit Quellen-Nennung — wie ADR-0004.
