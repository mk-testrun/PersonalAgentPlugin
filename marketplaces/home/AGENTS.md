# AGENTS.md — Home-Marketplace Konventionen

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

## §2.1 Konventionen (identisch wie Work)

Skill · Command · Agent — siehe Work AGENTS.md für vollständige Beschreibung.

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

### §2.8 Workflows
Identisch zu Work, aber:
- GitHub statt ADO
- Kein Workitem-Zwang
- Kein `/ship`
