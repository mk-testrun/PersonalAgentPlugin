# Anweisungen für KI-Agenten in diesem Repo

Dieses Monorepo baut zwei GitHub-Copilot-CLI-Marketplaces (Work/Home) + fünf MCP-Server.
Wer hier Änderungen macht (Mensch oder Agent), hält sich an diese Regeln.

## Befehle

```bash
npm install               # Workspaces; 'prepare: tsc' baut die TS-Server
npm test                  # validate + evals + test:tools + test:servers (vor jedem Push grün!)
npm run validate:strict   # wie CI: Warnungen brechen den Build (ADR-0007)
npm run maturity          # docs/skill-maturity.md regenerieren (CI prüft Drift!)
git config core.hooksPath .githooks   # pre-push-Schranke aktivieren (Dogfooding)
```

## Harte Regeln

1. **Zwei-Welten-Prinzip:** Work und Home teilen keine Skills/Agenten/Commands/Configs und
   referenzieren einander nie. Einzig Geteiltes: `mcp-servers/`.
2. **Secrets:** nur via `${secret:NAME}`, nie in Dateien. Scan-Ausgaben enthalten nie Klartext-Secrets.
3. **Skills sind Pakete** nach `docs/skill-authoring-guide.md` (SKILL.md-Hub + reference/examples/
   evals/scripts) — keine neuen Flachdateien. `meta`-Skills (`skill-author` etc.) erzeugen das Layout.
4. **Versionen:** `plugin.json` ist Quelle der Wahrheit; `marketplace.json` folgt (Validator warnt bei Drift).
5. **Generierte Dateien:** `docs/skill-maturity.md` nie von Hand editieren — `npm run maturity`.
6. **MCP-Server:** dep-arm (Node-Builtins bevorzugt), `dist/` bleibt ungetrackt (`prepare: tsc`),
   Tests dep-frei ausführbar. Anonymizer-Proxy: fail-closed, nie crashen, nie unmaskiert weiterreichen.
7. **ADRs:** Architekturentscheidungen nach `docs/adr/` (nächste Nummer via bestehender Dateien);
   bestehende ADRs werden fortgeschrieben („Update“-Abschnitt), nicht umgeschrieben.

## Wo was steht

| Thema | Datei |
|---|---|
| Architektur/Konventionen (Hooks, Guardrails, MCP-Pfade) | `ARCHITECTURE.md` |
| Skill-Qualitätsstandard + Definition of Done | `docs/skill-authoring-guide.md` |
| Entscheidungen (Guardrails, MCP-Konventionen, Tiering, Maturity) | `docs/adr/` |
| Ist-Reifegrad (generiert) vs. Wellenplan (manuell) | `docs/skill-maturity.md` / `docs/skill-uplift-tracker.md` |
| Beitragen (Flow: skill-author → validate → evals → maturity) | `marketplaces/{work,home}/CONTRIBUTING.md` |
