# Home-Marketplace

GitHub-Copilot-CLI-Marketplace für private Projekte — visual-first, experimentierfreudig, GitHub, Multi-Lang.

## Installation

```bash
copilot plugin marketplace add ./marketplaces/home
```

**Reihenfolge:** general → visual/audio → morning → reviewer → lab → orchestration → meta

## Plugins

| Plugin | Beschreibung |
|---|---|
| general | GitHub, Profile (MCP-Sets), Multi-Lang-Conventions, warn-Hooks |
| visual | Charts, Excalidraw, Cloud-Bild-Gen, SVG, Timeline |
| audio | TTS/speak (kein STT), Sound-Notifications |
| morning | Tagesstart-Briefing, Energy-Tracking, Week-Highlight-Reel |
| reviewer | WCAG, BFSG, Security, Performance, Internet-Playwright |
| lab | Playwright codegen, neue MCPs, Home Assistant |
| orchestration | GitHub-Workflows: /feature, /bugfix (kein /ship) + Agent-Loop |
| meta | Skill/Plugin-Author, Validator |

## Umgebungsvariablen

| Variable | Typ | Beschreibung |
|---|---|---|
| `HASS_URL` | env | Home Assistant URL |
| `HASS_TOKEN` | env | Home Assistant Token |
| `GH_PAT` | secret | GitHub Personal Access Token |
| `BRAVE_KEY` | secret | Brave Search API-Key |
| `NOTION_TOKEN` | secret | Notion Token |
| `OPENAI_KEY` | secret | OpenAI API-Key (image-generate) |
| `ST_BASE_URL` | env (optional) | SuperTonic `serve`-URL (Default `http://127.0.0.1:8000`; on-device, kein Key) |
| `CONTEXT7_KEY` | secret | Context7 Key (optional) |

## Profile (`/profile <name>`)

| Profil | MCPs |
|---|---|
| coding | github, context7, filesystem, git |
| writing | fetch, brave-search, filesystem |
| media | supertonic, imagegen |
| audio | supertonic, alarm-mcp, time |
| lab | playwright, chrome-devtools, homeassistant |

## Sicherheitsmodell

- **Tool-Guardian: warn** — warnt statt zu blocken
- **secret-scan: block** — bleibt scharf (auch im Home-Modus)
- **Playwright: Internet erlaubt** (eigene Homepages, GitHub Pages)
- **Audit-Log** (30 Tage): `.copilot/state/audit.jsonl`

## Produktiver Test

```bash
# /profile wechseln
/profile media

# Cloud-Bild-Gen
/visualize "Ein sonnenuntergang über Hamburg"

# TTS
/speak "Guten Morgen, hier ist dein Tages-Briefing"

# Morning-Briefing
/morning

# Review mit WCAG
/review wcag

# Lab: URL erkunden
/explore https://meine-homepage.de
```
