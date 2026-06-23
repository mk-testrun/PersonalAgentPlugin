# mkrueer-copilot — Monorepo

Zwei GitHub-Copilot-CLI-Marketplaces (**Work** und **Home**) mit vier geteilten Custom-MCP-Servern.

## Struktur

```
mkrueer-copilot/
├── mcp-servers/          # Geteilte Custom-MCPs (npm-Workspaces)
│   ├── anonymizer-proxy/ # PII-Proxy für Work/ADO
│   ├── password-gen/     # Kryptografischer Passwort-Generator
│   ├── alarm-mcp/        # Alarm/Timer-Server (Home)
│   └── dotnet-mcpserver-starter/  # .NET-MCP-Template
├── marketplaces/
│   ├── work/             # Work-Marketplace (10 Plugins, ADO/Blazor/.NET)
│   └── home/             # Home-Marketplace (9 Plugins, GitHub/Multi-Lang)
├── tools/
│   ├── validate-plugins.mjs    # Validiert plugin.json-Struktur
│   └── relocate-manifests.mjs  # Fallback: kopiert manifests nach .github/plugin/
└── docs/                 # ADRs, Konzepte, Schemata
```

## Zwei-Welten-Prinzip

Work und Home teilen **keine** Skills, Agenten, Commands oder Konfiguration.
Das **einzige** Geteilte sind die Custom-MCP-Server unter `mcp-servers/`.

- **Work:** hart abgesichert, Azure DevOps, Blazor/.NET, Tool-Guardian **block**
- **Home:** experimentierfreudig, visual-first, GitHub, Tool-Guardian **warn**

## Schnellstart

```bash
# Abhängigkeiten installieren (alle Workspaces)
npm install

# Beide Marketplaces validieren
node tools/validate-plugins.mjs marketplaces/work
node tools/validate-plugins.mjs marketplaces/home

# MCP-Tests ausführen
npm test --workspaces
```

## Installation der Marketplaces

```bash
# Work
copilot plugin marketplace add ./marketplaces/work

# Home
copilot plugin marketplace add ./marketplaces/home
```

Details siehe:
- [Work-Marketplace README](marketplaces/work/README.md)
- [Home-Marketplace README](marketplaces/home/README.md)
- [Architektur-Spezifikation](ARCHITECTURE.md)
