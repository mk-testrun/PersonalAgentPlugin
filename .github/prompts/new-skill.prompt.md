---
mode: agent
description: "Neuen Skill anlegen (Welt wählen, Layout nach ADR-0006, scoped validieren)"
---

Lege einen neuen Skill an. Frage zuerst, falls unklar: **Welt** (work/home), **Plugin**, **Name**,
**Zweck/Trigger**.

1. Lies `docs/skill-authoring-guide.md` und ADR-0006 (`docs/adr/0006-skill-package-layout.md`).
2. Erzeuge `marketplaces/<welt>/plugins/<plugin>/skills/<name>/SKILL.md` mit Frontmatter
   `name` + reichhaltiger `description` („Nutze wenn …", konkrete Trigger-Phrasen).
3. Ergänze je nach Umfang `reference.md`, `examples.md`, `scripts/`, `evals/cases.json`
   (mindestens 2 Eval-Cases).
4. Validiere scoped: `node tools/validate-plugins.mjs --skill <pfad>` und
   `node tools/run-evals.mjs marketplaces/<welt>` — behebe alle `error`-Findings.
5. Zeige mir Maturity-Achsen, die noch schwach sind (`--maturity`), und schlage den nächsten
   Uplift-Schritt vor.
