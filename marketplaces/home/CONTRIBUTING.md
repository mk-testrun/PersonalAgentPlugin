# Contributing — Home-Marketplace

## Neuen Skill hinzufügen

1. Plugin-Verzeichnis wählen
2. `skills/<name>/SKILL.md` anlegen mit Frontmatter + Body
3. In `plugin.json` eintragen
4. `node tools/validate-plugins.mjs marketplaces/home` → 0 Fehler

## Sicherheits-Checkliste (relaxter als Work)

- [ ] Keine Secrets in Dateien (nur `${secret:NAME}`)
- [ ] secret-scan bleibt scharf (auch im warn-Modus)
- [ ] gitleaks bleibt scharf für secrets-scan

## Validierung

```bash
node tools/validate-plugins.mjs marketplaces/home
```
