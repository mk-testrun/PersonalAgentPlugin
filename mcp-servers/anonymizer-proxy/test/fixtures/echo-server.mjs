#!/usr/bin/env node
/**
 * echo-server.mjs — minimaler Downstream-Fake für den Proxy-Integrationstest.
 * Antwortet auf tools/call je nach arguments.mode:
 *   (default)   result mit E-Mail + Echo der empfangenen Argumente
 *   "error-pii" JSON-RPC-Error, dessen message/data PII enthält (testet A6-Error-Masking)
 *   "iban"      result mit gültiger Test-IBAN (muss den Block auslösen)
 */
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method !== 'tools/call') return;
  const args = msg.params?.arguments ?? {};
  let reply;
  if (args.mode === 'error-pii') {
    reply = { jsonrpc: '2.0', id: msg.id, error: {
      code: -32000,
      message: 'user john.doe@corp.example not found',
      data: { contact: 'jane.roe@corp.example' },
    } };
  } else if (args.mode === 'iban') {
    reply = { jsonrpc: '2.0', id: msg.id, result: {
      content: [{ type: 'text', text: 'Konto DE89370400440532013000' }],
    } };
  } else {
    reply = { jsonrpc: '2.0', id: msg.id, result: {
      content: [{ type: 'text', text: `mail: alice.smith@corp.example · echo: ${JSON.stringify(args)}` }],
    } };
  }
  process.stdout.write(JSON.stringify(reply) + '\n');
});
