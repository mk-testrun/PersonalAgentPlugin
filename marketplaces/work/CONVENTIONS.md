# CONVENTIONS.md — Work-Marketplace Konventionen

> Früher „AGENTS.md" — umbenannt, weil AGENTS.md inzwischen ein offener Standard für
> Repo-Instruktionen an Coding-Agenten ist (siehe Root-AGENTS.md dieses Monorepos).
> Diese Datei hier sind die *Autoren-Konventionen* des Marketplaces.

## Agenten-Übersicht

| Agent | Plugin | Write-Scope |
|---|---|---|
| devops | general | Write nur mit [CONFIRM]; nie Cross-Project; kein Hard-Delete |
| onboarder | onboarding | Read-mostly; Confluence read-only; nie Secrets |
| blazor | blazor | Normaler Dev-Write; [CONFIRM] bei destruktiv |
| tester | testing | edit+execute; Playwright nur localhost |
| reviewer | review | **Read-only** außer `.copilot/state/reports/` |
| orchestrator | orchestration | Keine Direkt-Writes ohne [CONFIRM]; delegiert |
| documenter | doku | Nur Drafts; publish nur mit [CONFIRM] |
| prompt-builder | meta | Plugin/Skill-Dateien; Marketplace-Config mit [CONFIRM] |
| visualizer | experimental | Output nur nach `state/artifacts/`; CDN-Allowlist |
| loop | experimental | Iteriert mit Hard-Limit; mutierend nur mit [CONFIRM]; delegiert Verifikation |

## §2.1 Command vs. Skill vs. Agent

### Skill
- Wiederverwendbare Fähigkeit
- `skills/<name>/SKILL.md` mit Frontmatter `name` + `description` ("Nutze wenn …")
- Optional: `applyTo` (Glob), `mcp_tools` — **umgebungsspezifisch, nicht veraltet**: die Copilot CLI
  implementiert sie (noch) nicht (Validator meldet das zur Information als Warning/Hint),
  VS Code wertet `applyTo` aus. Kompatibilitätsmatrix: docs/skill-authoring-guide.md.
- Body: klare Steps/Checks

### Command
- Benutzer-wählbarer Slash-Einstieg (`commands/<name>.md`)
- Frontmatter: `description` + Body (Prompt)
- Entweder (a) Workflow (verkettet Skills) oder (b) dünner Wrapper auf einen Skill
- **Verboten:** Doppel-Indirektion (Command → Skill → Skill ohne eigene Logik)

### Agent
- Persona (`agents/<name>.agent.md`)
- Frontmatter: `name`, `description`, `tools` (Array), `model`
- Body: Verhalten + Write-Scope

## §2.2 Write-Scope je Agent

Jeder Agent-Body dokumentiert seinen Write-Scope explizit:
- Welche Pfade/Operationen erlaubt sind
- Welche **[CONFIRM]** erfordern
- Welche verboten sind

## §2.7 Render-Pattern (Visual-Skills)

Jeder Visual-Skill implementiert **selbst** beide Modi:

- **Rich (VS Code):** HTML als MCP-UI-Resource inline
- **Fallback (CLI):** Mermaid-Quelltext / ASCII + `state/artifacts/`-Pfad

Keine zentrale Abstraktion — jeder Skill entscheidet selbst.

## §2.8 Workflow-Querschnitt (Orchestrator)

1. **Dry-run zuerst** — kompletter Plan inkl. [CONFIRM]/[GATE]-Punkte
2. **Run-Log** nach `state/artifacts/run-<workflow>-<ts>.md`
3. **Idempotenz** — vor Branch-Anlage prüfen
4. **[CONFIRM]** = Stopp + Ja/Nein vor Schreiben
5. **[GATE]** = harter Stopp bei critical/high, Default „nein"
