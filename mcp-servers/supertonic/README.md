# supertonic3-mcp

MCP server that turns text into speech using **[Supertonic](https://github.com/supertone-inc/supertonic)** —
a lightning-fast, on-device, multilingual ONNX TTS. It wraps Supertonic's local HTTP server
(`supertonic serve`) and its OpenAI-compatible `/v1/audio/speech` endpoint, so **no API key and no
cloud call** are involved. Dependency-free Node ESM (built-ins only) — ships and runs without `npm install`.

## Prerequisite — run Supertonic locally

```bash
pip install supertonic
supertonic serve            # local server, default http://127.0.0.1:8000
```

## Wire it up (`.mcp.json`)

```json
{
  "mcpServers": {
    "supertonic": {
      "command": "supertonic3-mcp",
      "env": {
        "ST_BASE_URL": "${env:ST_BASE_URL}",
        "ST_DEFAULT_VOICE": "warm-de",
        "ST_OUTPUT_DIR": "${env:USERPROFILE}/.copilot/state/audio"
      }
    }
  }
}
```

| Env | Default | Meaning |
|---|---|---|
| `ST_BASE_URL` | `http://127.0.0.1:8000` | `supertonic serve` base URL |
| `ST_DEFAULT_VOICE` | `default` | voice id used when the tool call omits one |
| `ST_MODEL` | `supertonic` | model name sent to the endpoint |
| `ST_OUTPUT_DIR` | cwd | directory the audio file is written to |
| `ST_TIMEOUT_MS` | `30000` | request timeout |

## Tool

### `synthesize`
- `text` (required) — text to speak
- `voice` (optional) — voice id (else `ST_DEFAULT_VOICE`)
- `format` (optional) — `mp3` (default), `wav`, `opus`, `flac`, `pcm`, `aac`
- `filename` (optional) — sanitized; always written **under** `ST_OUTPUT_DIR` (no traversal)

Returns the path of the written file. If `supertonic serve` is not reachable, the tool returns an
actionable error (it does not crash the server).

## Develop

```bash
npm run check     # syntax-check both modules
npm test          # pure-logic tests (no network; stubbed fetch + temp-dir write)
```
