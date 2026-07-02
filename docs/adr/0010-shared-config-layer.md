# ADR-0010: Geteilte Konfigurationsschicht (editor/, profiles/, templates/, Copilot-Harness)

Status: Akzeptiert · Datum: 2026-07-02

## Kontext

Das Zwei-Welten-Prinzip (ADR-0001) erlaubte als einziges Geteiltes die Custom-MCP-Server.
In der Praxis fehlte damit alles, was eine **Maschine** produktiv macht: Editor-Settings,
ein reproduzierbarer Einrichtungsweg, Repo-Templates und die Copilot-Harness auf
Repo-Ebene (instructions/prompts/setup-steps). Beides sind aber Infrastruktur-, keine
Fach-Inhalte — die Trennung Work↔Home betrifft *Verhalten* (Skills, Agents, Commands,
Hooks, Policies), nicht *Werkzeug-Grundausstattung*.

## Entscheidung

Die geteilte Schicht wird erweitert. Geteilt sind ab jetzt genau:

| Verzeichnis | Inhalt |
|---|---|
| `mcp-servers/` | Custom-MCP-Server (wie bisher, ADR-0005) |
| `editor/` | VS-Code-Baseline + Home/Work-Overlays (Settings, Extensions); `.editorconfig` im Root |
| `profiles/` | Maschinen-Profile: Marketplace, Plugin-Set, Editor-Overlay, globale `mcpExtras` |
| `templates/` | Kopiervorlagen (repo-starter) |
| `tools/` | Validator, Evals, **bootstrap.mjs** |
| `.github/` | Copilot-Harness des Monorepos: `copilot-instructions.md`, `instructions/`, `prompts/`, `copilot-setup-steps.yml`, CI |

**Unverändert getrennt:** Skills, Agents, Commands, Hooks, Policies und Plugin-`.mcp.json`
je Welt. Die Overlays (`settings.work.json` vs. `settings.home.json`) kodieren die
Weltunterschiede deklarativ (Work härter: Telemetrie off, kein Auto-Task-Run,
Branch-Protection).

Einrichtungsweg: `node tools/bootstrap.mjs --profile <home|work> [--apply]` — idempotent,
merged nur verwaltete Keys, druckt Copilot-CLI- und Extension-Kommandos statt fremden
Tool-State zu mutieren.

## Konsequenzen

- Eine neue Maschine ist mit `git clone` + `npm install` + Bootstrap + zwei gedruckten
  Kommando-Blöcken arbeitsfähig; Drift zwischen Maschinen wird per `git pull` + erneutem
  Bootstrap eingefangen.
- Das Zwei-Welten-Prinzip lautet fortan: *„Work und Home teilen keine fachlichen Inhalte;
  geteilt ist ausschließlich Infrastruktur (mcp-servers, editor, profiles, templates,
  tools, Harness)."* README/ARCHITECTURE sind entsprechend angepasst.
- Upstream-Referenzen (externe MCP-Server, adaptierte Skills) sind in
  `docs/upstream-catalog.md` inventarisiert; `npx -y` = latest bleibt bewusste Policy,
  Pinning bei Bedarf dort dokumentieren.
- CI prüft die neue Schicht mit: Bootstrap-Tests + Dry-Runs beider Profile, JSON-Syntax
  aller Konfigdateien, Sync-Check der repo-starter-`.editorconfig`.
