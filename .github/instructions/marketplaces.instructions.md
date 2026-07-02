---
applyTo: "marketplaces/**"
---

# Marketplace-Inhalte (Plugins, Skills, Agents, Commands, Hooks)

- Formate strikt nach Copilot-CLI-Spec; `tools/validate-plugins.mjs` ist die Wahrheit.
  Nach jeder Änderung scoped laufen lassen (`--skill`/`--plugin`/`--changed-only`).
- SKILL.md-Frontmatter: `name` + mehrzeilige `description` („Nutze wenn …", Trigger-Beispiele).
  Referenz-/Beispiel-Dateien nach ADR-0006 (`reference.md`, `examples.md`, `scripts/`, `evals/`).
- Review-Skills geben `findings[]` nach `docs/findings-schema.md` aus —
  `node tools/validate-findings.mjs` prüft das.
- Hooks: Events und preToolUse-JSON-Contract siehe ARCHITECTURE §2.9; Skripte liegen im Plugin
  unter `hooks/scripts/` und werden via `{{plugin_data_dir}}` referenziert.
- Work-Inhalte niemals aus Home referenzieren und umgekehrt (Zwei-Welten-Prinzip).
- Evals: jede nicht-triviale Skill-Änderung aktualisiert `evals/cases.json` mit.
