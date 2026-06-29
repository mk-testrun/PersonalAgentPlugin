# anonymizer-proxy

Transparenter stdio-Proxy zwischen dem Copilot-Client und einem Downstream-MCP-Server.
Maskiert PII bidirektional.

## Robustheit

- **Framing:** newline-delimitiertes JSON-RPC; unparsbare Zeilen werden unverändert durchgereicht.
- **Block-PII:** fail-closed → JSON-RPC-Error (`-32001`), nichts wird geleakt.
- **Unerwartete Masker-Fehler:** fail-closed (`-32002`) + stderr-Log — der Proxy **crasht nicht**.
- **Downstream-Fehler/Write-Fehler:** abgefangen und geloggt.
- **Persistenz:** deterministische Pseudonym-Map (`ANON_MAP_FILE`).

## Datenfluss

```
Client (Modell) ←→ anonymizer-proxy ←→ Downstream MCP (z.B. @azure-devops/mcp)
```

**Downstream → Client (Tool-Ergebnisse):** `maskDeep` — PII → deterministische Pseudonyme
(`<PERSON_xxxxxx>`). Block-PII (IBAN, Steuer-ID) → fail-closed → JSON-RPC-Error.

**Client → Downstream (Tool-Argumente):** `unmaskDeep` bekannte Pseudonyme → echte Werte.
Zusätzlich `scanBlockDeep` — rohe Block-PII vom Modell → fail-closed deny.

## Wiring (`.mcp.json`)

```json
{
  "mcpServers": {
    "ado": {
      "command": "anonymizer-proxy",
      "env": {
        "DOWNSTREAM_CMD": "npx",
        "DOWNSTREAM_ARGS": "[\"-y\",\"@azure-devops/mcp\",\"${env:ADO_ORG}\"]",
        "AZURE_DEVOPS_PAT": "${secret:ADO_PAT}",
        "AZURE_DEVOPS_PROJECT": "${env:ADO_PROJECT}",
        "ANON_SALT": "${secret:ANON_SALT}"
      }
    }
  }
}
```

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|---|---|---|
| `DOWNSTREAM_CMD` | — | Pflicht: Befehl für den Downstream-Server |
| `DOWNSTREAM_ARGS` | `[]` | JSON-Array der Argumente |
| `PII_PATTERNS` | bundled `pii-patterns.json` | Pfad zu eigenen Patterns |
| `ANON_SALT` | `anon-salt` | Salt für deterministisches Hashing |
| `ANON_MAP_FILE` | `.copilot/state/pseudonym.map.json` | Persistente Pseudonym-Map |
| `UNMASK_RESULTS` | `true` | false = kein Unmask auf Client→Downstream |

## PII-Patterns

**Block** (fail-closed): `IBAN`, `SteuerID`
**Anonymize** (Pseudonyme): `Email`, `ADO-UPN`, `FullName`, `PhoneDE`

## Testen

```bash
node --check src/masker.mjs && node --check src/server.mjs
node test/roundtrip.mjs
```
