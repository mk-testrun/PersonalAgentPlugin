---
name: skill-author
description: Nutze wenn ein neuer Skill nach den Marketplace-Konventionen erstellt werden soll.
---

## Eingaben

- `name`: Skill-Name (kebab-case)
- `description`: Trigger-Beschreibung „Nutze wenn …"
- `applyTo`: optionale Glob-Muster für proaktive Aktivierung
- `mcp_tools`: optional genutzte MCP-Tools

## Ausgabe

`skills/<name>/SKILL.md` mit korrektem Frontmatter und strukturiertem Body.

## Konventionen (§2.1)

- Skill ≠ Command: kein Doppel-Wrapper
- Kein Doppel-Indirektion
- Body: klare Steps/Checks, kein Pseudocode
