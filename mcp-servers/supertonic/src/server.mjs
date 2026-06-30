#!/usr/bin/env node
/**
 * supertonic3-mcp — MCP stdio server wrapping a local `supertonic serve` HTTP endpoint.
 *
 * Supertonic is an on-device, multilingual ONNX TTS. Its Python SDK exposes `supertonic serve`,
 * a local server with an OpenAI-compatible /v1/audio/speech endpoint — so this MCP server needs
 * NO API key. It exposes a single `synthesize` tool that writes an audio file and returns its path.
 *
 * Env:
 *   ST_BASE_URL       supertonic serve base URL (default http://127.0.0.1:8000)
 *   ST_DEFAULT_VOICE  default voice id (default "default")
 *   ST_MODEL          model name sent to the endpoint (default "supertonic")
 *   ST_OUTPUT_DIR     directory for generated audio (default cwd)
 *   ST_TIMEOUT_MS     request timeout (default 30000)
 *
 * Framing: newline-delimited JSON-RPC 2.0 over stdio (MCP stdio transport).
 */
import { createInterface } from 'readline';
import { resolveConfig, synthesize, FORMATS, errMsg } from './tts.mjs';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'supertonic3-mcp', version: '1.0.0' };

const TOOL = {
  name: 'synthesize',
  description:
    'Convert text to speech with the local on-device Supertonic TTS and write an audio file. ' +
    'Requires `supertonic serve` running (no API key). Returns the output file path.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to synthesize to speech.' },
      voice: { type: 'string', description: 'Voice id (default from ST_DEFAULT_VOICE).' },
      format: { type: 'string', enum: Object.keys(FORMATS), description: 'Audio format (default mp3).' },
      filename: { type: 'string', description: 'Optional output filename (sanitized; written under ST_OUTPUT_DIR).' },
    },
    required: ['text'],
    additionalProperties: false,
  },
};

const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const ok = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function handleToolCall(id, params) {
  const name = params?.name;
  if (name !== TOOL.name) return fail(id, -32602, `unknown tool: ${name}`);
  const args = params?.arguments ?? {};
  const cfg = resolveConfig(process.env);
  try {
    const { path, bytes } = await synthesize(args.text, args, cfg, {});
    const kb = (bytes / 1024).toFixed(1);
    ok(id, { content: [{ type: 'text', text: `Wrote ${kb} KB of audio to ${path}` }] });
  } catch (e) {
    // Tool-level failure → isError result (not a protocol error) so the model can react.
    ok(id, { content: [{ type: 'text', text: `synthesize failed: ${errMsg(e)}` }], isError: true });
  }
}

function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      return ok(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    case 'notifications/initialized':
    case 'initialized':
      return; // notification — no response
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: [TOOL] });
    case 'tools/call':
      return void handleToolCall(id, params);
    default:
      if (id !== undefined) fail(id, -32601, `method not found: ${method}`);
  }
}

const reader = createInterface({ input: process.stdin, crlfDelay: Infinity });
reader.on('line', line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }   // ignore unparsable lines
  try { handle(msg); }
  catch (e) {
    process.stderr.write(`supertonic3-mcp: handler error: ${errMsg(e)}\n`);
    if (msg && msg.id !== undefined) fail(msg.id, -32603, 'internal error');
  }
});
