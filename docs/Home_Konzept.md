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

## Plugins (8)

| Plugin | Zweck |
|---|---|
| general | GitHub, Profile, Hooks (warn), Multi-Lang-Conventions, loop/tdd-loop |
| visual | Visual-first: Charts, Excalidraw, Cloud-Bild-Gen |
| audio | TTS/speak (kein STT), Sound-Notifications |
| morning | Angereichertes Tagesstart-Briefing + Energy-Tracking |
| reviewer | Entspannter Home-Reviewer (auch Internet-Targets) |
| lab | Spielwiese: neue MCPs, Playwright codegen, Home Assistant |
| orchestration | Home-Workflows (Feature/Bugfix, kein /ship) |
| meta | Tooling über Tooling |

## Sicherheitsmodell

- `preToolUse` → secret-scan **block**, tool-guardian **warn** (deny → allow+Warnung)
- Audit-JSONL (redacted, **30-Tage**-Rotation)
- Keine PII-Anonymisierung (kein Work-ADO-Kontext)
- Playwright darf Internet-Targets (eigene Homepages, GitHub Pages)

## Umgebungsvariablen

Eine Quelle statt zwei driftender Tabellen: die vollständige, gepflegte Liste steht im
[Home-README](../marketplaces/home/README.md) (Abschnitt „Umgebungsvariablen“).
Konvention: Secrets nur via `${secret:NAME}`, nie in Dateien.
