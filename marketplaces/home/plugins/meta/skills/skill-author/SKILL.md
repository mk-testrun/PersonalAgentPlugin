---
name: skill-author
description: >-
  Nutze um einen neuen Skill als Paket nach docs/skill-authoring-guide.md zu erstellen — echte Inhalte, keine
  leere Boilerplate: SKILL.md-Hub (name + reiche description) plus reference/examples/templates/scripts/evals
  wo sinnvoll. Copilot CLI liest nur name + description im Frontmatter.
---

## Eingaben

- `name` (kebab-case) · `description` (3. Person, „Nutze wenn …", nennt Trigger **und** genutzte MCP-Server im Text). Copilot CLI liest nur diese zwei Frontmatter-Felder.

## Pflicht-Pattern (Body)

Jeder Skill hat **echten, recherchierten Inhalt** in dieser Struktur:

```markdown
---
name: <name>
description: Nutze wenn … (Trigger + genutzte MCP-Server im Text)
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
