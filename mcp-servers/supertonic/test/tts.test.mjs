/**
 * tts.test.mjs — pure-logic tests for the supertonic MCP server. No network, no real disk writes
 * outside a temp dir. Run: node test/tts.test.mjs
 */
import assert from 'assert';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveConfig, buildSpeechRequest, outputPath, synthesize, FORMATS } from '../src/tts.mjs';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; process.stdout.write(`  ✓ ${name}\n`); };

// --- resolveConfig ---
await t('resolveConfig defaults when env empty', () => {
  const c = resolveConfig({});
  assert.equal(c.baseUrl, 'http://127.0.0.1:8000');
  assert.equal(c.voice, 'default');
  assert.equal(c.model, 'supertonic');
  assert.equal(c.timeoutMs, 30000);
});

await t('resolveConfig honors env and strips trailing slash', () => {
  const c = resolveConfig({ ST_BASE_URL: 'http://host:9000/', ST_DEFAULT_VOICE: 'warm-de', ST_MODEL: 'x', ST_TIMEOUT_MS: '5000' });
  assert.equal(c.baseUrl, 'http://host:9000');
  assert.equal(c.voice, 'warm-de');
  assert.equal(c.model, 'x');
  assert.equal(c.timeoutMs, 5000);
});

// --- buildSpeechRequest ---
await t('buildSpeechRequest produces OpenAI-compatible body', () => {
  const cfg = resolveConfig({});
  const r = buildSpeechRequest('hello', { voice: 'v1', format: 'wav' }, cfg);
  assert.equal(r.url, 'http://127.0.0.1:8000/v1/audio/speech');
  assert.equal(r.format, 'wav');
  assert.deepEqual(r.body, { model: 'supertonic', input: 'hello', voice: 'v1', response_format: 'wav' });
});

await t('buildSpeechRequest defaults format to mp3 and voice from cfg', () => {
  const cfg = resolveConfig({ ST_DEFAULT_VOICE: 'cfgvoice' });
  const r = buildSpeechRequest('hi', {}, cfg);
  assert.equal(r.format, 'mp3');
  assert.equal(r.body.voice, 'cfgvoice');
});

await t('buildSpeechRequest rejects empty text', () => {
  assert.throws(() => buildSpeechRequest('   ', {}, resolveConfig({})), /non-empty/);
});

await t('buildSpeechRequest rejects unknown format', () => {
  assert.throws(() => buildSpeechRequest('hi', { format: 'midi' }, resolveConfig({})), /unsupported format/);
});

// --- outputPath ---
await t('outputPath sanitizes and appends extension', () => {
  const cfg = resolveConfig({ ST_OUTPUT_DIR: '/tmp/out' });
  const p = outputPath(cfg, { filename: 'My Clip!' }, 'mp3');
  assert.equal(p, join('/tmp/out', 'My_Clip_.mp3'));
});

await t('outputPath blocks path traversal', () => {
  const cfg = resolveConfig({ ST_OUTPUT_DIR: '/tmp/out' });
  // ../../etc/passwd → directory components stripped → stays inside outDir
  const p = outputPath(cfg, { filename: '../../etc/passwd' }, 'wav');
  assert.ok(p.startsWith(join('/tmp/out') ), 'must stay under outDir');
  assert.ok(!p.includes('etc/passwd'.replace('/', '')) || p.startsWith('/tmp/out'), 'no traversal');
  assert.ok(p.endsWith('.wav'));
});

await t('FORMATS covers the documented set', () => {
  for (const f of ['mp3', 'wav', 'opus', 'flac', 'pcm']) assert.ok(FORMATS[f], `missing ${f}`);
});

// --- synthesize (stubbed fetch + real temp-dir write) ---
await t('synthesize writes audio to a temp dir and reports bytes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'st-test-'));
  try {
    const cfg = resolveConfig({ ST_OUTPUT_DIR: dir });
    const fakeBytes = Buffer.from('ID3fake-audio-bytes');
    let calledUrl, calledBody;
    const fetchImpl = async (url, init) => {
      calledUrl = url; calledBody = JSON.parse(init.body);
      return { ok: true, status: 200, statusText: 'OK', arrayBuffer: async () => fakeBytes };
    };
    const res = await synthesize('hallo welt', { filename: 'greet', format: 'mp3' }, cfg, { fetchImpl });
    assert.equal(calledUrl, `${cfg.baseUrl}/v1/audio/speech`);
    assert.equal(calledBody.input, 'hallo welt');
    assert.equal(res.bytes, fakeBytes.length);
    assert.deepEqual(readFileSync(res.path), fakeBytes);
    assert.ok(res.path.endsWith('greet.mp3'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await t('synthesize surfaces a non-200 with detail', async () => {
  const cfg = resolveConfig({ ST_OUTPUT_DIR: tmpdir() });
  const fetchImpl = async () => ({ ok: false, status: 500, statusText: 'Server Error', text: async () => 'boom' });
  await assert.rejects(synthesize('x', {}, cfg, { fetchImpl }), /500 Server Error: boom/);
});

await t('synthesize gives an actionable message when serve is unreachable', async () => {
  const cfg = resolveConfig({ ST_OUTPUT_DIR: tmpdir() });
  const fetchImpl = async () => { throw new Error('connect ECONNREFUSED 127.0.0.1:8000'); };
  await assert.rejects(synthesize('x', {}, cfg, { fetchImpl }), /supertonic serve/);
});

await t('synthesize rejects an empty audio body', async () => {
  const cfg = resolveConfig({ ST_OUTPUT_DIR: tmpdir() });
  const fetchImpl = async () => ({ ok: true, status: 200, statusText: 'OK', arrayBuffer: async () => Buffer.alloc(0) });
  await assert.rejects(synthesize('x', {}, cfg, { fetchImpl }), /empty audio body/);
});

// allow async tests above to settle
await new Promise(r => setTimeout(r, 50));
process.stdout.write(`\nsupertonic tts.test: ${passed} checks passed.\n`);
