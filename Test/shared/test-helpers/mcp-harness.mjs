/**
 * Test-Harness: startet einen MCP-Server als Kindprozess und spricht
 * newline-delimited JSON-RPC über stdio — wie es die Copilot CLI tut.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

export class McpTestClient {
  constructor(serverPath, env = {}) {
    this.child = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    this.stderr = '';
    this.child.stderr.on('data', d => (this.stderr += d));
    this.pending = new Map();
    this.nextId = 1;
    const rl = createInterface({ input: this.child.stdout, terminal: false });
    rl.on('line', line => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      const resolve = this.pending.get(msg.id);
      if (resolve) {
        this.pending.delete(msg.id);
        resolve(msg);
      }
    });
  }

  request(method, params) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`timeout waiting for ${method} (stderr: ${this.stderr})`));
        }
      }, 5000).unref();
    });
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return promise;
  }

  callTool(name, args = {}) {
    return this.request('tools/call', { name, arguments: args });
  }

  async close() {
    this.child.stdin.end();
    await once(this.child, 'exit');
  }
}
