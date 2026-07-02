---
name: plugin-author
description: >-
  Nutze um ein neues Plugin-Verzeichnis nach dem Marketplace-Pattern zu scaffolden: erzeugt
  .github/plugin/plugin.json mit allen Pflichtfeldern (name/description/version/author/license) +
  agents/commands/skills-Listen und das Grundgerüst. Danach mit marketplace-validate prüfen.
---

## Erzeugt

- `plugins/<name>/plugin.json` — alle Pflichtfelder (`name`, `description`, `version`, `author`, `license`) + `agents`/`commands`/`skills`-Listen.
- `plugins/<name>/agents/<name>.agent.md` — via `agent-author` (Mission/Tool-Scope/Delegation/Verboten, `model: gpt-5`).
- `plugins/<name>/skills/<name>/SKILL.md` — via `skill-author` (echter Inhalt, kein Stub).
- optional `commands/<name>.md` via `command-author`; optional `.mcp.json`/`hooks.json`/`policy/`.
- Eintrag in `marketplace.json` (`name`, `source`, `description`, `version`, `keywords`) — **[CONFIRM]**.

## Regeln

- Plugin hat **einen klaren Zweck**; Skills fokussiert, einzeln aufrufbar; Agent nur wenn er einen eigenen Tool-/Write-Scope durchsetzt.
- Beschreibungen handlungsorientiert; keine Verweise auf andere Marketplaces.
- **Keine leeren Skills/Commands** — jeder Baustein mit echtem Inhalt (Qualitäts-Gate aus `skill-author`).

## Validierung

Nach dem Scaffolding `marketplace-validate` ausführen — 0 Fehler, bevor das Plugin als fertig gilt.
