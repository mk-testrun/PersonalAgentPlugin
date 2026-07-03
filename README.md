# mkrueer-copilot — Monorepo

Zwei GitHub-Copilot-CLI-Marketplaces (**Work** und **Home**) mit fünf geteilten Custom-MCP-Servern.

## Struktur

```
mkrueer-copilot/
├── mcp-servers/          # Geteilte Custom-MCPs (npm-Workspaces)
│   ├── anonymizer-proxy/ # PII-Proxy für Work/ADO
│   ├── password-gen/     # Passwort/Passphrase/GUID/ULID/Zeit/Hash-Generator
│   ├── alarm-mcp/        # Alarm/Timer-Server (Home)
│   ├── artifact-viewer/  # Universal-Renderer (rich + Fallback)
│   └── supertonic/       # On-Device-TTS (wraps `supertonic serve`)
├── marketplaces/
│   ├── work/             # Work-Marketplace (9 Plugins, ADO/Blazor/.NET)
│   └── home/             # Home-Marketplace (8 Plugins, GitHub/Multi-Lang)
├── tools/
│   ├── validate-plugins.mjs   # Spec-Validierung (tiered) + Scoped Runs + Maturity
│   ├── validate-findings.mjs  # findings[]-Schema-Check der Review-Skills
│   ├── run-evals.mjs          # Struktur-Check der evals/cases.json
│   ├── setup-mcp-servers.sh   # install + build + npm link aller MCP-Server
│   └── lib/                   # field-taxonomy.mjs, maturity.mjs
└── docs/                 # ADRs, Konzepte, Schemata, Authoring-Guide, Maturity
```

> Das .NET-MCP-Template liegt als Kopiervorlage in `work/meta/skills/mcp-author/templates/dotnet-starter/`
> (kein laufender Server → nicht unter `mcp-servers/`).

## Zwei-Welten-Prinzip

Work und Home teilen **keine** Skills, Agenten, Commands oder Konfiguration.
Das **einzige** Geteilte sind die Custom-MCP-Server unter `mcp-servers/`.

- **Work:** hart abgesichert, Azure DevOps, Blazor/.NET, Tool-Guardian **block**
- **Home:** experimentierfreudig, visual-first, GitHub, Tool-Guardian **warn**

## Schnellstart

```bash
npm install                                   # alle Workspaces ('prepare: tsc' baut die TS-Server)
node tools/validate-plugins.mjs marketplaces/work
node tools/validate-plugins.mjs marketplaces/home
npm test --workspaces                         # MCP-Server-Tests
```

## Validieren

```bash
# ganzer Marketplace (Default)
node tools/validate-plugins.mjs marketplaces/work

# nur ein Skill/Plugin/Agent/Command (z. B. nach Neuanlage via meta)
node tools/validate-plugins.mjs --skill marketplaces/work/plugins/doku/skills/product-functions
node tools/validate-plugins.mjs --changed-only origin/main   # nur git-geänderte Items

# Reifegrad messen (reines Reporting)
node tools/validate-plugins.mjs --maturity
node tools/validate-plugins.mjs --maturity-md docs/skill-maturity.md
```

Findings sind **dreistufig**: `error` (CLI lädt nicht) · `warning` (nur Fremd-KI-Produkt) ·
`hint` (Schwester-IDE VS Code/Visual Studio). `--strict` macht Warnungen zu Fehlern (CI). Details:
[ADR-0007](docs/adr/0007-validation-tiers.md).

- Ist-Stand der Skills: **`docs/skill-maturity.md`** (auto-generiert)
- Absicht/Wellenplan: **`docs/skill-uplift-tracker.md`** (manuell)

## Installation

**1. MCP-Server lauffähig machen** — die Plugin-`.mcp.json` referenzieren die Server über ihre
bin-Namen (`anonymizer-proxy`, `password-gen-mcp`, `alarm-mcp`, `artifact-viewer`,
`supertonic3-mcp`); die müssen auf dem PATH liegen:

```bash
./tools/setup-mcp-servers.sh          # npm install + build (prepare: tsc) + npm link je Server
./tools/setup-mcp-servers.sh --check  # prüft nur, ob alle bins auffindbar sind
```

**2. Marketplaces registrieren:**

```bash
copilot plugin marketplace add ./marketplaces/work
copilot plugin marketplace add ./marketplaces/home
```

Details:
- [Work-Marketplace README](marketplaces/work/README.md)
- [Home-Marketplace README](marketplaces/home/README.md)
- [Architektur-Spezifikation](ARCHITECTURE.md) · [Authoring-Guide](docs/skill-authoring-guide.md)
