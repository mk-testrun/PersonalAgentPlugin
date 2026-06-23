# ADR 0003: Home Marketplace — Plugin-Mapping

**Status:** Accepted  
**Datum:** 2026-06-23

## Kontext

Der Home-Marketplace soll experimentierfreudig, visual-first und mehrsprachig sein.
GitHub statt ADO, entspanntere Policy, aber secret-scan bleibt scharf.

## Plugin-Mapping

| Plugin | Verantwortungsbereich |
|---|---|
| general | GitHub Issues/PRs, Profile (MCP-Sets), Multi-Lang-Conventions, warn-Hooks |
| visual | Mermaid, Chart.js, Excalidraw, Cloud-Bild-Gen, SVG, Timeline, Mindmap |
| audio | SuperTonic TTS, Sound-Notifications (postToolUse-Hook) |
| morning | Dashboard-Briefing, Energy-Tracking, Week-Highlight-Reel |
| reviewer | Entspannter Reviewer: auch Internet-Playwright, tolerantes env-lint |
| lab | Playwright codegen, Tool-Inventory neuer MCPs, Home Assistant |
| orchestration | GitHub-Workflows: /feature, /bugfix, /review-flow (kein /ship) |
| meta | Skill/Plugin-Author, Validator, AGENTS.md, AI-Readiness |
| fun | Ralph-Wiggum (Easter-Eggs, Sticker in Slides) |

## Abgrenzung audio ↔ morning

- `audio` besitzt die TTS-Fähigkeit (speak-summary, sound-notifications)
- `morning` **delegiert** an audio für TTS-Begrüßung — dupliziert die Fähigkeit nicht
- `morning` besitzt die Dashboard- und Energy-Tracking-Logik

## Profile-System

`general/policy/profiles.json` definiert MCP-Sets je Profil:
- `coding` → dotnet-mcp-builder, context7
- `writing` → fetch, brave-search
- `media` → supertonic, imagegen
- `audio` → supertonic, alarm-mcp, time
- `lab` → playwright, chrome-devtools, homeassistant

## Konsequenzen

- `reviewer/.mcp.json` setzt Playwright **ohne** localhost-Einschränkung
- `audio/hooks/scripts/notify-with-sound.sh|ps1` braucht plattformunabhängige Sound-Logik
- `fun/config.json` steuert Easter-Egg-Features opt-in
