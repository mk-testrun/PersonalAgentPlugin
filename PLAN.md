# Buildplan: mkrueer-copilot Monorepo

Status-Legende: ⬜ Offen · 🔄 In Bearbeitung · ✅ Erledigt · ❌ Fehler

---

## §7 Format-Härtung (Verifikationsschritt)

- ✅ `plugin.json` Ort → **Plugin-Root** (bestätigt per GitHub Docs)
- ✅ `marketplace.json` Ort → `.github/plugin/` (bestätigt)
- ✅ `sharplens-mcp` → Paket existiert (`pzalutski-pixel/sharplens-mcp`)
- ✅ `@antv/mcp-server-chart` → Paket existiert
- ✅ `excalidraw-mcp` → offizielles Paket `excalidraw/excalidraw-mcp` existiert
- ✅ `openai-images-mcp` → **NICHT gefunden** → ersetzt durch `imagegen-mcp`
- ✅ `.mcp.json` `_note`/`_disabled` → werden **entfernt** (Notizen in README)
- ✅ MCP-UI-Resources → Rich als progressive enhancement, Fallback Pflicht

---

## Schritt 1: Monorepo-Skelett ✅

- ✅ `package.json` (Workspaces)
- ✅ `README.md`
- ✅ `ARCHITECTURE.md`
- ✅ `.gitignore`
- ✅ `LICENSE` (MIT)
- ✅ `tools/validate-plugins.mjs`
- ✅ `tools/relocate-manifests.mjs`
- ✅ `docs/findings-schema.md`
- ✅ `docs/Work_Konzept.md`
- ✅ `docs/Home_Konzept.md`
- ✅ `docs/adr/0001-monorepo.md`
- ✅ `docs/adr/0002-work-plugin-mapping.md`
- ✅ `docs/adr/0003-home-plugin-mapping.md`
- ✅ `.github/workflows/ci.yml`

---

## Schritt 2: Custom MCP-Server ✅

### 2.1 anonymizer-proxy ✅
- ✅ `package.json`
- ✅ `src/masker.mjs`
- ✅ `src/server.mjs`
- ✅ `pii-patterns.json`
- ✅ `test/roundtrip.mjs`
- ✅ `README.md`
- ✅ Syntax-Check grün
- ✅ Test grün (6/6)

### 2.2 password-gen ✅
- ✅ `package.json` (type: module)
- ✅ `src/index.ts`
- ✅ `tsconfig.json`
- ✅ `test/entropy.test.mjs`
- ✅ `README.md`
- ✅ Build grün
- ✅ Test grün (8/8)

### 2.3 alarm-mcp ✅
- ✅ `package.json` (type: module)
- ✅ `src/index.ts`
- ✅ `src/scheduler.ts`
- ✅ `tsconfig.json`
- ✅ `test/scheduler.test.mjs`
- ✅ `README.md`
- ✅ Build grün
- ✅ Test grün (5/5)

### 2.4 dotnet-mcpserver-starter ✅
- ✅ `McpServerStarter.csproj`
- ✅ `Program.cs`
- ✅ `Tools/UtilityTools.cs`
- ✅ `README.md`

---

## Schritt 3: Work-Marketplace (10 Plugins) ✅

- ✅ `.github/plugin/marketplace.json`
- ✅ `README.md`
- ✅ `AGENTS.md`
- ✅ `CONTRIBUTING.md`

### Plugins
- ✅ **general** — Agent, 6 Skills, 6 Commands, Hooks (sh+ps1), Policy, .mcp.json
- ✅ **onboarding** — Agent, 6 Skills, 5 Commands, Hook, .mcp.json
- ✅ **blazor** — Agent, 13 Skills, Hooks (sh+ps1), .mcp.json
- ✅ **testing** — Agent, 7 Skills, 3 Commands, .mcp.json
- ✅ **review** — Agent, 18 Skills, 3 Commands, .mcp.json
- ✅ **orchestration** — Agent, 5 Commands
- ✅ **doku** — Agent, 7 Skills, 1 Command, .mcp.json
- ✅ **meta** — Agent, 5 Skills, 3 Commands
- ✅ **experimental** — Agent, 16 Skills, 6 Commands, Policy, .mcp.json
- ✅ **fun** — 1 Skill, 1 Command

- ✅ `validate-plugins.mjs marketplaces/work` → **0 Fehler**

---

## Schritt 4: Home-Marketplace (9 Plugins) ✅

- ✅ `.github/plugin/marketplace.json`
- ✅ `README.md`
- ✅ `AGENTS.md`
- ✅ `CONTRIBUTING.md`

### Plugins
- ✅ **general** — Agent, 9 Skills, 6 Commands, Hooks (sh+ps1), Policy+Profiles, .mcp.json
- ✅ **visual** — Agent, 13 Skills, 3 Commands, .mcp.json
- ✅ **audio** — 2 Skills, 1 Command, Hook (sh+ps1), .mcp.json
- ✅ **morning** — Agent, 3 Skills, 1 Command, .mcp.json
- ✅ **reviewer** — Agent, 12 Skills, 1 Command, .mcp.json
- ✅ **lab** — Agent, 3 Skills, 2 Commands, .mcp.json
- ✅ **orchestration** — Agent, 3 Commands
- ✅ **meta** — Agent, 5 Skills, 3 Commands
- ✅ **fun** — 1 Skill, 1 Command, config.json

- ✅ `validate-plugins.mjs marketplaces/home` → **0 Fehler**

---

## Schritt 5: Konventionen & Abschluss ✅

- ✅ Beide `AGENTS.md` mit §2.1/§2.2/§2.7/§2.8 Konventionen
- ✅ Beide `CONTRIBUTING.md`
- ✅ `ARCHITECTURE.md` als lebende Referenz
- ✅ `PLAN.md` (dieses Dokument)
- ✅ Commit + Push auf `claude/copilot-marketplace-monorepo-irc3zh`

---

## Ergebnis

**Gesamtstatus: ✅ FERTIG**

Alle Akzeptanzkriterien erfüllt:
- Beide Marketplaces: `validate-plugins.mjs` → 0 Fehler
- MCP-Tests: anonymizer (6/6), password-gen (8/8), alarm-mcp (5/5)
- §7 Format-Härtung durchgeführt
- Keine Secrets im Repo
- READMEs mit Install + Produktiv-Test
