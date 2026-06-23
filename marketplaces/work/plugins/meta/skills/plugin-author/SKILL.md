---
name: plugin-author
description: Nutze wenn ein neues Plugin-Verzeichnis scaffoldet werden soll.
---

## Erzeugt

- `plugins/<name>/plugin.json` (alle Pflichtfelder)
- `plugins/<name>/agents/<name>.agent.md` (Write-Scope dokumentiert)
- `plugins/<name>/skills/<name>/SKILL.md` (ein Start-Skill)
- Eintrag in marketplace.json — **[CONFIRM]**

## Validierung

Nach dem Scaffolding: marketplace-validate ausführen.
