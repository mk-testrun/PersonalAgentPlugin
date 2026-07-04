# Contributing — Home-Marketplace

Skills sind **Pakete**, keine Flachdateien (Standard: [`docs/skill-authoring-guide.md`](../../docs/skill-authoring-guide.md)
inkl. Definition-of-Done). Der schnellste korrekte Weg ist der geführte Flow:

## Neuen Skill hinzufügen (Paket-Flow)

1. **Generieren statt handschreiben:** meta/`skill-author` erzeugt das Paket-Layout
   (`SKILL.md`-Hub + `reference.md`/`references/` + `examples.md` + `evals/cases.json` + ggf. `scripts/`).
2. **Frontmatter:** `name` kebab-case; `description` in „Nutze wenn …“-Form mit Trigger-Begriffen.
   `applyTo`/`mcp_tools` sind umgebungsspezifisch (CLI ignoriert sie — Validator informiert).
3. **Eintragen:** Skill-Pfad in der `skills`-Liste der `plugin.json` des Plugins.
4. **Scoped validieren:**
   ```bash
   node tools/validate-plugins.mjs --skill marketplaces/home/plugins/<plugin>/skills/<name>
   ```
5. **Evals:** ≥3 Szenarien in `evals/cases.json`; `npm run evals` muss grün sein.
6. **Maturity:** `npm run maturity` regenerieren und `docs/skill-maturity.md` mitcommitten (CI bricht bei Drift).

## Sicherheits-Checkliste

- [ ] Keine Secrets in Dateien (nur `${secret:NAME}`)
- [ ] secret-scan bleibt scharf — auch im warn-Modus (Guardian blockt Secrets immer)
- [ ] Token-Patterns pflegen in `general/policy/betterleaks.toml` (Single Source für den Guardian)
- [ ] Keine Referenzen auf Skills/Agenten des Work-Marketplaces (Zwei-Welten)

## Vor dem Push

```bash
npm run validate:strict   # wie CI: Warnungen brechen den Build
npm test                  # validate + evals + Tool- + Server-Tests
git config core.hooksPath .githooks   # einmalig: pre-push-Schranke aktivieren
```
