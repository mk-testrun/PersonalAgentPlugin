# mkrueer-copilot — Persönliches Agent-Monorepo (Home + Work)

Alles für beide Welten in einem Repo: zwei GitHub-Copilot-CLI-Marketplaces (**Work** und
**Home**) mit Plugins, Skills, Agents, Commands und Hooks · fünf geteilte Custom-MCP-Server ·
Editor-Settings · Maschinen-Profile mit Bootstrap · Repo-Templates · Copilot-Harness · CI.

## Struktur

```
mkrueer-copilot/
├── mcp-servers/          # Geteilte Custom-MCPs (npm-Workspaces)
│   ├── anonymizer-proxy/ # PII-Proxy für Work/ADO
│   ├── password-gen/     # Passwort/Passphrase/GUID/ULID/Zeit/Hash-Generator
│   ├── alarm-mcp/        # Alarm/Timer-Server (Home)
│   ├── artifact-viewer/  # Universal-Renderer (rich + Fallback, MCP-App)
│   └── supertonic/       # On-Device-TTS (wraps `supertonic serve`)
├── marketplaces/
│   ├── work/             # Work-Marketplace (9 Plugins, ADO/Blazor/.NET)
│   └── home/             # Home-Marketplace (8 Plugins, GitHub/Multi-Lang)
├── editor/               # VS-Code-Baseline + Home/Work-Overlays (Settings, Extensions)
├── profiles/             # Maschinen-Profile: Marketplace, Plugin-Set, mcpExtras
├── templates/            # repo-starter — agent-ready Vorlage für neue Repos
├── tools/
│   ├── bootstrap.mjs          # Maschinen-Setup (--profile home|work [--apply])
│   ├── validate-plugins.mjs   # Spec-Validierung (tiered) + Scoped Runs + Maturity
│   ├── validate-findings.mjs · run-evals.mjs
│   └── lib/                   # field-taxonomy.mjs, maturity.mjs
├── .github/              # Copilot-Harness: copilot-instructions.md, instructions/,
│                         #   prompts/ (/new-skill /new-mcp-server /repo-health),
│                         #   copilot-setup-steps.yml, CI
└── docs/                 # ADRs, Konzepte, Schemata, Authoring-Guide, Upstream-Katalog
```

> Das .NET-MCP-Template liegt als Kopiervorlage in `work/meta/skills/mcp-author/templates/dotnet-starter/`
> (kein laufender Server → nicht unter `mcp-servers/`).

## Zwei-Welten-Prinzip

Work und Home teilen **keine fachlichen Inhalte** — keine Skills, Agenten, Commands, Hooks
oder Policies. Geteilt ist ausschließlich **Infrastruktur**: `mcp-servers/`, `editor/`,
`profiles/`, `templates/`, `tools/` und die Repo-Harness ([ADR-0010](docs/adr/0010-shared-config-layer.md)).

- **Work:** hart abgesichert, Azure DevOps, Blazor/.NET, Tool-Guardian **block**
- **Home:** experimentierfreudig, visual-first, GitHub, Tool-Guardian **warn**

## Neue Maschine einrichten (Home oder Work)

```bash
git clone <dieses-repo> && cd <repo>
npm install

node tools/bootstrap.mjs --profile home            # Dry-Run: zeigt den kompletten Plan
node tools/bootstrap.mjs --profile home --apply    # schreibt Editor-Settings + MCP-Extras
# … danach die gedruckten `code --install-extension`- und `copilot plugin …`-Kommandos ausführen
```

Für Work analog mit `--profile work`. Idempotent — nach jedem `git pull` wiederholbar.
Details: [profiles/README.md](profiles/README.md) · [editor/README.md](editor/README.md).

## Entwickeln & Validieren

```bash
npm test                                      # alles: validate + evals + tools + server
node tools/validate-plugins.mjs marketplaces/work     # ein Marketplace
node tools/validate-plugins.mjs --skill <pfad>        # nur ein Skill/Plugin/Agent/Command
node tools/validate-plugins.mjs --changed-only origin/main

# Reifegrad (reines Reporting)
node tools/validate-plugins.mjs --maturity
node tools/validate-plugins.mjs --maturity-md docs/skill-maturity.md
```

Findings sind **dreistufig**: `error` (CLI lädt nicht) · `warning` (nur Fremd-KI-Produkt) ·
`hint` (Schwester-IDE VS Code/Visual Studio). `--strict` macht Warnungen zu Fehlern (CI). Details:
[ADR-0007](docs/adr/0007-validation-tiers.md).

- Ist-Stand der Skills: **`docs/skill-maturity.md`** (auto-generiert)
- Absicht/Wellenplan: **`docs/skill-uplift-tracker.md`** (manuell)
- Copilot-Prompts im Repo: `/new-skill` · `/new-mcp-server` · `/repo-health` (`.github/prompts/`)

## Neues Projekt starten

```bash
cp -r templates/repo-starter/. /pfad/zum/neuen-repo/
```

AGENTS.md, Copilot-Instructions, `.editorconfig`, Starter-CI und `.mcp.json` sind dann
schon da — nur die `TODO:`-Marker füllen ([templates/README.md](templates/README.md)).

## Weiterführend

- [Work-Marketplace README](marketplaces/work/README.md) · [Home-Marketplace README](marketplaces/home/README.md)
- [Architektur-Spezifikation](ARCHITECTURE.md) · [Authoring-Guide](docs/skill-authoring-guide.md)
- [Upstream-Katalog](docs/upstream-catalog.md) — referenzierte Top-Projekte + Pinning-Policy
