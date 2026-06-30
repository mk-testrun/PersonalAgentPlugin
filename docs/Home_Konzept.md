# Home-Marketplace — Konzept

## Zielbild

Der Home-Marketplace ist das experimentierfreudige, visual-first Copilot-Erweiterungspaket
für private Projekte. GitHub statt ADO, mehrsprachig (C#/Python/Go/Web/Home-Assistant),
entspannte Tool-Guardian-Policy.

## Charakter

- **Visual-first:** Dashboards, Charts, Excalidraw-Skizzen, Cloud-Bild-Generierung erlaubt
- **GitHub-zentriert:** Issues, PRs, Actions über den offiziellen GitHub MCP Server (`ghcr.io/github/github-mcp-server`)
- **Multi-Lang:** C#, Python (uv/ruff/mypy), Go, TypeScript, Compose/Homelab
- **Warn-Modus:** Tool-Guardian warnt statt zu blocken (Ausnahme: secret-scan bleibt block)
- **Profile:** coding/writing/media/audio/lab wechseln MCP-Sets via `/profile`

## Plugins (9)

| Plugin | Zweck |
|---|---|
| general | GitHub, Profile, Hooks (warn), Multi-Lang-Conventions |
| visual | Visual-first: Charts, Excalidraw, Cloud-Bild-Gen |
| audio | TTS/speak (kein STT), Sound-Notifications |
| morning | Angereichertes Tagesstart-Briefing + Energy-Tracking |
| reviewer | Entspannter Home-Reviewer (auch Internet-Targets) |
| lab | Spielwiese: neue MCPs, Playwright codegen, Home Assistant |
| orchestration | Home-Workflows (Feature/Bugfix, kein /ship) |
| meta | Tooling über Tooling |
| fun | Ralph-Wiggum (freier als Work, Easter-Eggs) |

## Sicherheitsmodell

- `preToolUse` → secret-scan **block**, tool-guardian **warn** (deny → allow+Warnung)
- Audit-JSONL (redacted, **30-Tage**-Rotation)
- Keine PII-Anonymisierung (kein Work-ADO-Kontext)
- Playwright darf Internet-Targets (eigene Homepages, GitHub Pages)

## Umgebungsvariablen (erforderlich)

| Variable | Typ | Beschreibung |
|---|---|---|
| `HASS_URL` | env | Home Assistant URL |
| `HASS_TOKEN` | env | Home Assistant Long-Lived Token |
| `ONENOTE_NOTEBOOKS` | env | OneNote Notebook-Namen (kommagetrennt) |
| `GH_PAT` | secret | GitHub Personal Access Token |
| `BRAVE_KEY` | secret | Brave Search API-Key |
| `NOTION_TOKEN` | secret | Notion Integration Token |
| `OPENAI_KEY` | secret | OpenAI API-Key (für image-generate) |
| `ST_BASE_URL` | env (optional) | SuperTonic `serve`-URL (Default `http://127.0.0.1:8000`; on-device, kein Key) |
| `CONTEXT7_KEY` | secret | Context7 API-Key (optional) |
