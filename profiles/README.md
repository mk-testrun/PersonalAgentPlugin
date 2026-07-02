# profiles/ — Maschinen-Profile (Home + Work)

Ein Profil beschreibt, wie eine Maschine an dieses Monorepo angeschlossen wird:
welcher Marketplace, welche Plugins, welche Editor-Overlays und welche **globalen**
MCP-Extras (Server, die kein Plugin mitbringt, z. B. `memory`).

```
profiles/
├── home/profile.json   # GitHub, Multi-Lang, visual-first, warn-Modus
└── work/profile.json   # ADO, Blazor/.NET, block-Modus
```

## Einrichten einer Maschine

```bash
git clone <dieses-repo> && cd <repo> && npm install

node tools/bootstrap.mjs --profile home            # Dry-Run: kompletter Plan
node tools/bootstrap.mjs --profile home --apply    # Editor-Settings + MCP-Extras schreiben
```

Der Bootstrap:

1. **Editor:** merged `editor/vscode/settings.shared.json` + Profil-Overlay in die
   VS-Code-User-Settings (nur verwaltete Keys, Rest bleibt unangetastet).
2. **Extensions:** druckt `code --install-extension …`-Kommandos (kein Auto-Install).
3. **Marketplace/Plugins:** druckt die `copilot plugin marketplace add` / `copilot plugin
   install`-Kommandos für das Profil (die CLI verwaltet ihren eigenen State — bewusst
   nicht automatisiert).
4. **MCP-Extras:** merged `mcpExtras` in `~/.copilot/mcp-config.json` (bestehende
   Server bleiben erhalten; gleichnamige werden auf den Profil-Stand gebracht).

Alles ist idempotent — der Bootstrap kann nach jedem `git pull` erneut laufen.

## Abgrenzung

- **Plugin-`.mcp.json`** (in den Marketplaces): Server, die ein Plugin fachlich braucht —
  kommen mit der Plugin-Installation.
- **`mcpExtras`** (hier): maschinen-globale Server ohne Plugin-Bindung.
- **`profile-switch`-Skill** (Home/general): schaltet zur *Laufzeit* Server-Sets um
  (coding/writing/media/audio/lab) — orthogonal zu diesen Maschinen-Profilen.
- Herkunft/Pinning der Upstream-Server: `docs/upstream-catalog.md`.
