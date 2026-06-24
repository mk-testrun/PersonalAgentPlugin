# ADR 0001: Monorepo für Work + Home Marketplace

**Status:** Accepted  
**Datum:** 2026-06-23

## Kontext

Work- und Home-Marketplace teilen Custom-MCP-Server, haben aber komplett unterschiedliche
Sicherheitsmodelle, Stacks und Persönlichkeiten. Die Frage war: ein Repo oder zwei?

## Entscheidung

Ein Monorepo mit klarer Trennung:
- `mcp-servers/` ist das **einzige** Geteilte (npm-Workspaces)
- `marketplaces/work/` und `marketplaces/home/` sind vollständig isoliert
- Kein Cross-Reference zwischen den beiden Marketplace-Verzeichnissen

## Begründung

- Einmaliger CI-Lauf validiert beide Marketplaces
- Custom-MCPs werden einmal gebaut und getestet
- Beide Marketplaces bleiben installierbar als eigenständige Verzeichnisse
- `copilot plugin marketplace add ./marketplaces/work` funktioniert ohne Monorepo-Kenntnis

## Konsequenzen

- MCP-Server haben echte `bin`-Einträge und werden über Binärnamen referenziert (kein relativer Pfad)
- `validate-plugins.mjs` muss beide Marketplace-Pfade als Parameter akzeptieren
- `.gitignore` muss `node_modules/` und `dist/` in allen Workspaces abdecken
