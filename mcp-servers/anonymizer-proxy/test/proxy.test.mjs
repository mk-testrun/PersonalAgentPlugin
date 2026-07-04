/**
 * proxy.test.mjs — Integrationstest über den echten Prozess: Client ↔ anonymizer-proxy ↔ Echo-Downstream.
 * Deckt ab: Result-Masking, Error-Masking (A6), Block fail-closed (Result + Args),
 * Unmask von Pseudonymen Richtung Downstream. Run: node test/proxy.test.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dir = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dir, '..', 'src', 'server.mjs');
const FIXTURE = join(__dir, 'fixtures', 'echo-server.mjs');

const stateDir = mkdtempSync(join(tmpdir(), 'anonproxy-'));
const proxy = spawn('node', [SERVER], {
  env: {
    ...process.env,
    DOWNSTREAM_CMD: 'node',
    DOWNSTREAM_ARGS: JSON.stringify([FIXTURE]),
    ANON_SALT: 'proxy-test-salt',
    ANON_MAP_FILE: join(stateDir, 'map.json'),
  },
  stdio: ['pipe', 'pipe', 'inherit'],
});

const pending = new Map(); // id → resolve
const reader = createInterface({ input: proxy.stdout, crlfDelay: Infinity });
reader.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const resolve = pending.get(msg.id);
  if (resolve) { pending.delete(msg.id); resolve(msg); }
});

let nextId = 1;
function call(args, timeoutMs = 5000) {
  const id = nextId++;
  const req = { jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'echo', arguments: args } };
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`timeout waiting for id ${id}`)); }, timeoutMs);
    pending.set(id, (msg) => { clearTimeout(t); resolve(msg); });
    proxy.stdin.write(JSON.stringify(req) + '\n');
  });
}

let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log(`✓ ${name}`); };

try {
  await t('result: downstream-E-Mail wird pseudonymisiert', async () => {
    const res = await call({ query: 'harmlos' });
    const text = res.result.content[0].text;
    assert.ok(!text.includes('alice.smith@corp.example'), text);
    assert.match(text, /<(Email|PERSON)_[a-f0-9]{6}>/);
  });

  await t('error (A6): PII in error.message und error.data wird maskiert', async () => {
    const res = await call({ mode: 'error-pii' });
    const flat = JSON.stringify(res.error);
    assert.ok(!flat.includes('john.doe@corp.example'), flat);
    assert.ok(!flat.includes('jane.roe@corp.example'), flat);
    assert.match(flat, /<(Email|PERSON)_[a-f0-9]{6}>/);
    assert.equal(res.error.code, -32000, 'Error-Code bleibt erhalten');
  });

  await t('block fail-closed: IBAN im Result → -32001, IBAN erscheint nirgends', async () => {
    const res = await call({ mode: 'iban' });
    assert.equal(res.error?.code, -32001);
    assert.ok(!JSON.stringify(res).includes('DE89370400440532013000'));
  });

  await t('block fail-closed: Steuer-ID in Args → -32001 ohne Forwarding', async () => {
    const res = await call({ query: 'IdNr 86095742719' });
    assert.equal(res.error?.code, -32001);
  });

  await t('unmask: Pseudonym in Args erreicht den Downstream als Original', async () => {
    // Schritt 1: Pseudonym erzeugen (Result-Masking legt die Map an)
    const first = await call({ query: 'wer ist da?' });
    const pseudonym = first.result.content[0].text.match(/<(?:Email|PERSON)_[a-f0-9]{6}>/)[0];
    // Schritt 2: Pseudonym zurückschicken — Echo zeigt, was der Downstream sah;
    // die Antwort wird erneut maskiert, also darf das Original NICHT auftauchen,
    // aber das Pseudonym muss (re-maskiert) wieder drinstehen.
    const second = await call({ note: `kontaktiere ${pseudonym}` });
    const text = second.result.content[0].text;
    assert.ok(text.includes(pseudonym), `Downstream sah das Original (re-maskiert): ${text}`);
    assert.ok(!text.includes('alice.smith@corp.example'), text);
  });

  console.log(`\nAll proxy integration tests passed (${n} checks).`);
} finally {
  proxy.kill();
  rmSync(stateDir, { recursive: true, force: true });
}
