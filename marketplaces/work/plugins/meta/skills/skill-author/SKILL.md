---
name: skill-author
description: Nutze um einen neuen Skill nach dem Marketplace-Pattern zu erstellen — echte Inhalte, keine leere Boilerplate.
---

## Eingaben

- `name` (kebab-case) · `description` („Nutze wenn …") · optional `applyTo` (Globs) · optional `mcp_tools`.

## Pflicht-Pattern (Body)

Jeder Skill hat **echten, recherchierten Inhalt** in dieser Struktur:

```markdown
---
name: <name>
description: Nutze wenn …
applyTo: [...]      # falls proaktiv
mcp_tools: [...]    # falls MCP genutzt
---

## Scope        – was abgedeckt ist / was nicht (Abgrenzung zu Nachbar-Skills)
## Checkliste/Schritte – konkrete, nummerierte Punkte (handlungsleitend)
## Output       – was zurückkommt; Pfad bei Artefakten
```

### Review-Skills zusätzlich
- Nummerierte Checkliste mit **ruleId-Stamm + Severity** (z.B. `SEC-AUTHZ … (critical)`).
- Output als `findings[]` nach `docs/findings-schema.md`; **[GATE]** bei critical/high.

### Visual-Skills zusätzlich
- `## Lib/CDN` (genaue Bibliothek), `## Daten-/Input-Schema`, `## Render-Pattern` (Rich + Fallback).

## Verboten (Qualitäts-Gate)

- **Keine leeren Platzhalter** („führe die notwendigen Schritte aus", „TODO", reines Render-Pattern ohne Bau-Anleitung).
- Skill ≠ Command (kein Doppel-Wrapper); keine Doppel-Indirektion (§2.1).
- Kein Pseudocode statt konkreter Schritte.

## Abschluss

`skills/<name>/SKILL.md` erzeugen, in `plugin.json` eintragen, `marketplace-validate` ausführen.
