# Contributing — Work-Marketplace

## Neuen Skill hinzufügen

1. Plugin-Verzeichnis wählen (oder neues Plugin via meta/`/new-plugin`)
2. `skills/<name>/SKILL.md` anlegen mit:
   - `name`: kebab-case
   - `description`: "Nutze wenn …" (Trigger)
   - optionalem `applyTo` und `mcp_tools`
3. In `plugin.json` des Plugins unter `skills` eintragen
4. `node tools/validate-plugins.mjs marketplaces/work` — muss 0 Fehler liefern

## Neuen Agenten hinzufügen

1. `agents/<name>.agent.md` mit Frontmatter + Write-Scope-Dokumentation
2. In `plugin.json` eintragen
3. In AGENTS.md Write-Scope-Tabelle aktualisieren

## Sicherheits-Checkliste

- [ ] Keine Secrets in Dateien — nur `${secret:NAME}`
- [ ] Playwright-Skills: nur `localhost:*`
- [ ] Visual-Skills: nur CDN-Allowlist
- [ ] Hook-Skripte: `.sh` + `.ps1` beide vorhanden
- [ ] policy/allowlist.tools.json aktuell

## Validierung

```bash
node tools/validate-plugins.mjs marketplaces/work
```

CI validiert automatisch bei jedem Push.
