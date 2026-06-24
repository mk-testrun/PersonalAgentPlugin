# password-gen-mcp

Kryptografisch sicherer Passwort- und Passphrase-Generator als MCP-Server.

> **Hinweis:** Dieser Server gibt generierte Passwörter ans Modell (und damit ins Kontextfenster).
> Für echte Produktions-Secrets empfiehlt sich ein direkter Keychain-Write ohne Modell-Umweg.

## Tools

| Tool | Beschreibung |
|---|---|
| `generate_password` | Passwort, length=8–128, symbols, count=1–20 |
| `generate_passphrase` | Diceware-Passphrase, words=3–12, separator |

## Build & Start

```bash
npm install
npm run build
password-gen-mcp
```

## Wiring (`.mcp.json`)

```json
{
  "mcpServers": {
    "password-gen": {
      "command": "password-gen-mcp"
    }
  }
}
```

## Test

```bash
node test/entropy.test.mjs
```
