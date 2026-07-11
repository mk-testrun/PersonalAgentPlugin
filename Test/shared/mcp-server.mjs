/**
 * Minimaler MCP-Server über stdio (newline-delimited JSON-RPC 2.0), dependency-frei.
 * Implementiert: initialize, ping, tools/list, tools/call.
 *
 * Tool-Definition: { name, description, inputSchema, handler(args) → any }
 * - handler darf async sein und Objekte oder Strings zurückgeben.
 * - Wirft der Handler PolicyError, wird ein isError-Ergebnis mit "POLICY BLOCKED"
 *   zurückgegeben (die Verbindung bleibt bestehen).
 */
import { createInterface } from 'node:readline';
import { PolicyError } from './errors.mjs';

const SUPPORTED_PROTOCOL_VERSIONS = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);
const FALLBACK_PROTOCOL_VERSION = '2024-11-05';

export class McpServer {
  constructor({ name, version, tools }) {
    this.serverInfo = { name, version };
    this.tools = new Map();
    for (const tool of tools) {
      if (this.tools.has(tool.name)) throw new Error(`duplicate tool name: ${tool.name}`);
      this.tools.set(tool.name, tool);
    }
  }

  listTools() {
    return [...this.tools.values()].map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }));
  }

  /** Verarbeitet eine JSON-RPC-Nachricht. Gibt die Antwort zurück oder null (Notification). */
  async handle(message) {
    const { id, method, params } = message ?? {};
    const isRequest = id !== undefined && id !== null;

    try {
      switch (method) {
        case 'initialize': {
          const requested = params?.protocolVersion;
          const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested)
            ? requested
            : FALLBACK_PROTOCOL_VERSION;
          return this.#result(id, {
            protocolVersion,
            capabilities: { tools: {} },
            serverInfo: this.serverInfo,
          });
        }
        case 'ping':
          return this.#result(id, {});
        case 'tools/list':
          return this.#result(id, { tools: this.listTools() });
        case 'tools/call': {
          const tool = this.tools.get(params?.name);
          if (!tool) return this.#error(id, -32602, `unknown tool: ${params?.name}`);
          return this.#result(id, await this.#callTool(tool, params));
        }
        case 'notifications/initialized':
        case 'notifications/cancelled':
          return null;
        default:
          if (!isRequest) return null; // unbekannte Notifications ignorieren
          return this.#error(id, -32601, `method not found: ${method}`);
      }
    } catch (err) {
      if (!isRequest) return null;
      return this.#error(id, -32603, err instanceof Error ? err.message : String(err));
    }
  }

  async #callTool(tool, params) {
    try {
      const result = await tool.handler(params?.arguments ?? {});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      const prefix = err instanceof PolicyError ? 'POLICY BLOCKED' : 'ERROR';
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `${prefix}: ${msg}` }], isError: true };
    }
  }

  #result(id, result) {
    return { jsonrpc: '2.0', id, result };
  }

  #error(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  /** Startet die stdio-Schleife (eine JSON-RPC-Nachricht pro Zeile). */
  start() {
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.on('line', async line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let message;
      try {
        message = JSON.parse(trimmed);
      } catch {
        process.stderr.write(`${this.serverInfo.name}: unparseable line ignored\n`);
        return;
      }
      const response = await this.handle(message);
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    });
    rl.on('close', () => process.exit(0));
  }
}
