# ADR-0005 — Konventionen für Custom-MCP-Server

## Status
Accepted · 2026-07-02 · Ersetzt: — · Ersetzt durch: —

## Kontext
Das Repo bringt eigene MCP-Server mit (anonymizer-proxy, password-gen, alarm-mcp, artifact-viewer,
supertonic). Ohne Konventionen driften diese in Sprache, Aufbau, Test-Stil und Wiring auseinander — und
ein Server, der eine schwere Runtime oder viele Dependencies braucht, lässt sich nicht sauber in einem
Plugin bündeln. Wir brauchen eine verbindliche Grundform.

## Optionen
- **A — Freie Wahl pro Server:** schnell, aber inkonsistent; jeder Server erfindet Test-Harness und
  Struktur neu.
- **B — Alles TypeScript + SDK:** einheitlich und typsicher, aber jeder Server braucht `npm install` +
  `tsc`-Build; ein committetes `dist/` muss gepflegt werden.
- **C — Zwei erlaubte Muster mit klarer Regel, wann welches:** dependency-freies Node-ESM als Default
  (läuft ohne Install), TypeScript+SDK dort, wo ein Tool-Schema/Typenaudit echten Wert hat.

## Entscheidung
**Option C.** Verbindliche Konventionen:

1. **Sprache/Muster:**
   - **Default: dependency-free Node ESM** (`.mjs`, nur Built-ins). Kein `npm install` nötig → im Plugin
     bündelbar. Beispiele: anonymizer-proxy, supertonic.
   - **TypeScript + `@modelcontextprotocol/sdk`** nur, wenn ein deklaratives Tool-Schema + Zod-Validierung
     den Aufwand rechtfertigt (password-gen, alarm-mcp, artifact-viewer). Build via `tsc` → committetes
     `dist/`, `bin` zeigt auf `dist/index.js`.
2. **Wiring:** immer über **Binärname** (`{"command":"<bin>"}`), nie relativer Pfad (§2.4). `package.json`
   deklariert `bin`; Root-Workspaces = `mcp-servers/*`.
3. **Sicherheit:** fail-closed — ein Server crasht nie unkontrolliert; unerwartete Fehler werden geloggt
   und sicher behandelt (anonymizer-proxy: nie unmaskiert weiterreichen). Keine ungefragten Netzaufrufe.
4. **Tests:** jeder Server hat `test/*.test.mjs` (Node-nativ, dependency-free), lauffähig ohne Build der
   reinen Logik; known-answer-Vektoren wo möglich (Hashes, Round-Trips).
5. **Templates statt Server:** Scaffolding-Vorlagen (z. B. dotnet-starter) gehören **nicht** unter
   `mcp-servers/` (kein laufender Server), sondern zum `meta/mcp-author`-Skill.

## Konsequenzen
- **Positiv:** dep-freie Server sind in Plugins bündelbar und sofort lauffähig; TS-Server bleiben dort, wo
  Typen zählen; einheitliches Test-Layout.
- **Kosten:** TS-Server brauchen ein committetes `dist/` (muss nach `src`-Änderung neu gebaut werden — CI
  sollte das prüfen); zwei Muster statt einem = eine Entscheidung mehr pro neuem Server (Regel in 1 löst sie).

## Offene Fragen
- Soll CI erzwingen, dass `dist/` mit `src/` übereinstimmt (rebuild + `git diff --exit-code`)?
- Reicht der Node-native Test-Runner, oder lohnt ein gemeinsames Mini-Harness in `mcp-servers/`?
