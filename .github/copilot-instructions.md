# Copilot-Instructions — mkrueer-copilot Monorepo

Dieses Repo ist ein persönliches Agent-Monorepo: zwei Copilot-CLI-Marketplaces
(**Work** und **Home**), fünf geteilte Custom-MCP-Server, geteilte Editor-Settings,
Profile und Templates. Kanonische Architektur: `ARCHITECTURE.md`, Entscheidungen: `docs/adr/`.

## Grundregeln

- **Zwei-Welten-Prinzip:** Work (`marketplaces/work`) und Home (`marketplaces/home`) teilen
  keine Skills, Agenten, Commands oder Plugin-Konfiguration. Geteilt sind nur
  `mcp-servers/`, `editor/`, `templates/`, `profiles/` und die Tools.
- Work ist hart abgesichert (Guardian **block**, ADO/Blazor/.NET); Home ist
  experimentierfreudig (Guardian **warn**, GitHub/Multi-Lang, visual-first).
- Antworten und Dokumentation auf **Deutsch**, Code/Identifier auf Englisch.

## Bevor du committest

```bash
node tools/validate-plugins.mjs marketplaces/work
node tools/validate-plugins.mjs marketplaces/home
node tools/run-evals.mjs marketplaces/work && node tools/run-evals.mjs marketplaces/home
npm run test:tools && npm run test:servers
```

Scoped: `node tools/validate-plugins.mjs --skill <pfad>` bzw. `--changed-only origin/main`.

## Konventionen (Kurzfassung)

- **Skill** = `skills/<name>/SKILL.md` (Frontmatter `name` + `description` „Nutze wenn …").
  Layout und Pflichtteile: `docs/skill-authoring-guide.md`, ADR-0006.
- **Command** = `commands/<name>.md` (Workflow oder dünner Skill-Wrapper, keine Doppel-Indirektion).
- **Agent** = `agents/<name>.agent.md` mit `name`, `description`, `tools`, `model`.
- **Custom-MCPs** referenzieren sich per Binärname (`"command": "artifact-viewer"`), ADR-0005.
- **Secrets** nur `${secret:NAME}` / `${env:NAME}` — nie in Dateien oder Git.
- Neue Skills/Plugins/Agents mit den `meta`-Plugin-Skills anlegen (skill-author, plugin-author, …)
  und danach scoped validieren.

## Was du nicht tust

- Keine neuen Top-Level-Verzeichnisse ohne ADR.
- Keine `npx`-MCP-Referenz auf Pakete, die es nicht gibt (Paketnamen erst prüfen — §7 ARCHITECTURE).
- Keine Work↔Home-Kopplung (auch nicht „nur dieses eine Shared-Util").
