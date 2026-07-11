import { test } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../mcp-server.mjs';
import { PolicyError } from '../errors.mjs';

function makeServer() {
  return new McpServer({
    name: 'test-server',
    version: '0.0.1',
    tools: [
      {
        name: 'echo',
        description: 'echo',
        inputSchema: { type: 'object', properties: { msg: { type: 'string' } } },
        handler: args => ({ echoed: args.msg }),
      },
      {
        name: 'blocked',
        description: 'always blocked',
        inputSchema: { type: 'object', properties: {} },
        handler: () => {
          throw new PolicyError('nicht erlaubt');
        },
      },
    ],
  });
}

test('initialize beantwortet Handshake mit Server-Info und Tools-Capability', async () => {
  const res = await makeServer().handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18' },
  });
  assert.equal(res.result.protocolVersion, '2025-06-18');
  assert.equal(res.result.serverInfo.name, 'test-server');
  assert.deepEqual(res.result.capabilities, { tools: {} });
});

test('unbekannte Protokollversion fällt auf 2024-11-05 zurück', async () => {
  const res = await makeServer().handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '1999-01-01' },
  });
  assert.equal(res.result.protocolVersion, '2024-11-05');
});

test('tools/list liefert Tool-Definitionen ohne Handler', async () => {
  const res = await makeServer().handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(res.result.tools.length, 2);
  assert.equal(res.result.tools[0].name, 'echo');
  assert.ok(!('handler' in res.result.tools[0]));
});

test('tools/call führt Handler aus und liefert JSON-Text', async () => {
  const res = await makeServer().handle({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'echo', arguments: { msg: 'hallo' } },
  });
  assert.equal(res.result.isError, undefined);
  assert.deepEqual(JSON.parse(res.result.content[0].text), { echoed: 'hallo' });
});

test('PolicyError wird als isError-Ergebnis mit POLICY BLOCKED gemeldet', async () => {
  const res = await makeServer().handle({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'blocked', arguments: {} },
  });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /^POLICY BLOCKED: nicht erlaubt/);
});

test('unbekanntes Tool und unbekannte Methode werden sauber gemeldet', async () => {
  const server = makeServer();
  const call = await server.handle({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'gibtsnicht' },
  });
  assert.equal(call.error.code, -32602);
  const unknown = await server.handle({ jsonrpc: '2.0', id: 6, method: 'foo/bar' });
  assert.equal(unknown.error.code, -32601);
});

test('Notifications erzeugen keine Antwort', async () => {
  const server = makeServer();
  assert.equal(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(await server.handle({ jsonrpc: '2.0', method: 'irgendwas/unbekanntes' }), null);
});
