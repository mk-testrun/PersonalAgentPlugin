# CONVENTIONS.md — Home-Marketplace Konventionen

> Früher „AGENTS.md" — umbenannt, weil AGENTS.md inzwischen ein offener Standard für
> Repo-Instruktionen an Coding-Agenten ist (siehe Root-AGENTS.md dieses Monorepos).
> Diese Datei hier sind die *Autoren-Konventionen* des Marketplaces.

## Agenten-Übersicht

| Agent | Plugin | Write-Scope |
|---|---|---|
| devops-home | general | GitHub Write mit [CONFIRM]; kein Force-Push main/master |
| visualizer | visual | Output nur nach `state/artifacts/`; Cloud-Bild-Gen erlaubt |
| morning | morning | Dashboard nach `state/artifacts/`; mood.jsonl |
| reviewer | reviewer | **Read-only** außer `.copilot/state/reports/`; Internet-Playwright |
| lab | lab | Playwright-Skripte nach `state/artifacts/`; Home-Assistant mit [CONFIRM] |
| orchestrator | orchestration | Keine Direkt-Writes ohne [CONFIRM]; delegiert |
| prompt-builder | meta | Plugin/Skill-Dateien; Marketplace-Config mit [CONFIRM] |
| loop | general | Iteriert mit Hard-Limit; delegiert Verifikation; warn-Modus |

## §2.1 Command vs. Skill vs. Agent

### Skill
- Wiederverwendbare Fähigkeit (`skills/<name>/SKILL.md`), Frontmatter `name` + `description` („Nutze wenn …").
- Optional: `applyTo` (Glob), `mcp_tools` — **umgebungsspezifisch, nicht veraltet**: die Copilot CLI
  implementiert sie (noch) nicht (Validator meldet das zur Information als Warning/Hint),
  VS Code wertet `applyTo` aus. Kompatibilitätsmatrix: docs/skill-authoring-guide.md.
- Body: klare Steps/Checks.

### Command
- Benutzer-wählbarer Slash-Einstieg (`commands/<name>.md`), Frontmatter `description` + Body (Prompt).
- Entweder Workflow (verkettet Skills) oder dünner Wrapper auf einen Skill — keine Doppel-Indirektion.

### Agent
- Persona (`agents/<name>.agent.md`), Frontmatter `name`, `description`, `tools`, `model`.
- Body: Mission · Tool-/Write-Scope · Verweise auf zuständige Skills/Agenten · Verboten.

## Home-spezifische Unterschiede

### warn-Modus
- Tool-Guardian: **warn** (allow + Reason statt deny)
- Ausnahme: secret-scan bleibt **block**

### Profile-System
`/profile <name>` wechselt das aktive MCP-Set (definiert in general/policy/profiles.json).

### Audio ↔ Morning Trennung
- `audio` besitzt TTS-Fähigkeit (speak-summary, sound-notifications)
- `morning` **delegiert** an audio — dupliziert nicht

### §2.7 Render-Pattern
Jeder Visual-Skill implementiert Rich (VS Code) + Fallback (CLI) selbst.
Cloud-Bild-Gen erlaubt im Home-Kontext.

### §2.8 Workflows (Orchestrator)
1. **Dry-run zuerst** — kompletter Plan inkl. [CONFIRM]/[GATE]-Punkte.
2. **Run-Log** nach `state/artifacts/run-<workflow>-<ts>.md`.
3. **[CONFIRM]** = Stopp vor jedem Schreiben · **[GATE]** = harter Stopp bei critical/high.
4. GitHub statt ADO · kein Workitem-Zwang · kein `/ship`.
