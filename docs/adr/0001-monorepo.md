# ADR-0001 — Monorepo für Work + Home Marketplace

## Status
Accepted · 2026-06-23 · Ersetzt: — · Ersetzt durch: —

## Kontext
Work- und Home-Marketplace teilen dieselben Custom-MCP-Server (PII-Proxy, Passwort-Generator,
Renderer, TTS), haben aber **komplett unterschiedliche** Sicherheitsmodelle (block vs warn), Stacks
(ADO/.NET vs GitHub/Multi-Lang) und „Persönlichkeiten". Ohne Entscheidung droht entweder dreifach
duplizierter Server-Code (bei getrennten Repos) oder Vermischung der beiden Welten (bei einem flachen
Repo). Beide Marketplaces müssen außerdem **eigenständig installierbar** bleiben
(`copilot plugin marketplace add ./marketplaces/work`).

## Optionen
- **A — Zwei getrennte Repos:** klare Isolation, aber MCP-Server müssten dupliziert oder als externes
  Paket versioniert werden; zwei CI-Pipelines; Server-Fixes doppelt.
- **B — Ein flaches Repo (alles gemischt):** maximale Wiederverwendung, aber kein Schutz gegen
  Cross-Referenzen zwischen den Welten; die block/warn-Trennung verwischt.
- **C — Monorepo mit harter Verzeichnis-Isolation:** geteilte Server unter `mcp-servers/`, sonst zwei
  vollständig getrennte `marketplaces/<welt>/`-Bäume ohne gegenseitige Referenzen.

## Entscheidung
**Option C.** Ein Monorepo mit npm-Workspaces:
- `mcp-servers/` ist das **einzige** Geteilte.
- `marketplaces/work/` und `marketplaces/home/` sind vollständig isoliert — kein Cross-Reference.
- MCP-Server werden über **Binärnamen** referenziert (`{"command":"anonymizer-proxy"}`), nie relativ.

## Konsequenzen
- **Positiv:** Server einmal bauen/testen; ein CI-Lauf validiert beide Marketplaces; beide bleiben als
  eigenständige Verzeichnisse installierbar.
- **Kosten:** `validate-plugins.mjs` muss den Marketplace-Pfad als Parameter nehmen (kein fixer Root);
  `.gitignore` deckt `node_modules/`/`dist/` in allen Workspaces ab; die Isolations-Regel muss
  diszipliniert eingehalten werden (der Validator warnt bei nicht-gelisteten Plugins, erzwingt die
  Welt-Trennung aber nicht automatisch).
- **Follow-ups:** MCP-Server-Konventionen → ADR-0005.

## Offene Fragen
- Sollte `meta` (in beiden Welten identisch) in einen dritten, geteilten „meta-marketplace" wandern, um
  die Duplizierung aufzulösen? Aktuell bewusst dupliziert (Pragmatismus vor DRY).
