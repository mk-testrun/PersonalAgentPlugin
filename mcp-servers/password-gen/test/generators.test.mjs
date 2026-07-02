/**
 * generators.test.mjs — guid / ulid / current_time / hash.
 * Mirrors the pure logic from src/index.ts (same pattern as entropy.test.mjs) and asserts against
 * known-answer vectors where possible. Run: node test/generators.test.mjs
 */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'crypto';

// --- mirrors of src/index.ts pure helpers ---
function uuidV7(time = Date.now()) {
  const b = randomBytes(16);
  b[0] = Math.floor(time / 2 ** 40) & 0xff; b[1] = Math.floor(time / 2 ** 32) & 0xff;
  b[2] = Math.floor(time / 2 ** 24) & 0xff; b[3] = Math.floor(time / 2 ** 16) & 0xff;
  b[4] = Math.floor(time / 2 ** 8) & 0xff;  b[5] = time & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid(time = Date.now()) {
  let ts = '', t = time;
  for (let i = 0; i < 10; i++) { ts = CROCKFORD[t % 32] + ts; t = Math.floor(t / 32); }
  let bits = 0n;
  for (const byte of randomBytes(10)) bits = (bits << 8n) | BigInt(byte);
  let rnd = '';
  for (let i = 0; i < 16; i++) { rnd = CROCKFORD[Number(bits & 31n)] + rnd; bits >>= 5n; }
  return ts + rnd;
}
function isoInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = {}; for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offMin = Math.round((asUTC - date.getTime()) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const oh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, '0');
  const om = String(Math.abs(offMin) % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${timeZone === 'UTC' ? 'Z' : `${sign}${oh}:${om}`}`;
}
function formatTime(tz, fmt, now) {
  if (fmt === 'unix') return String(Math.floor(now.getTime() / 1000));
  if (fmt === 'unix_ms') return String(now.getTime());
  if (fmt === 'human') return new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: tz }).format(now);
  return isoInZone(now, tz);
}
const hashValue = (input, algo, enc) => createHash(algo).update(input, 'utf8').digest().toString(enc);

let n = 0; const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`); };

// --- GUID v4 ---
t('guid v4: RFC-4122 shape + version/variant nibble', () => {
  const u = randomUUID();
  assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

// --- GUID v7 ---
t('guid v7: version 7, variant, timestamp prefix reflects input time', () => {
  const time = 0x0123456789ab;
  const u = uuidV7(time);
  assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(u.replace(/-/g, '').slice(0, 12), '0123456789ab', 'first 48 bits = timestamp');
});
t('guid v7: two ids for increasing time sort ascending', () => {
  const a = uuidV7(1000), b = uuidV7(2000);
  assert.ok(a < b, 'earlier time → lexicographically smaller');
});

// --- ULID ---
t('ulid: 26 chars, all Crockford base32', () => {
  const u = ulid();
  assert.equal(u.length, 26);
  for (const ch of u) assert.ok(CROCKFORD.includes(ch), `non-crockford char ${ch}`);
});
t('ulid: time prefix monotonic', () => {
  const a = ulid(1000), b = ulid(2000);
  assert.ok(a.slice(0, 10) <= b.slice(0, 10));
});

// --- hash (known-answer vectors) ---
t('hash: sha256("abc") hex vector', () => {
  assert.equal(hashValue('abc', 'sha256', 'hex'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
t('hash: md5("abc") + sha1("abc") vectors', () => {
  assert.equal(hashValue('abc', 'md5', 'hex'), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(hashValue('abc', 'sha1', 'hex'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});
t('hash: sha256("abc") base64 + base64url', () => {
  assert.equal(hashValue('abc', 'sha256', 'base64'), 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  const url = hashValue('abc', 'sha256', 'base64url');
  assert.ok(!url.includes('+') && !url.includes('/') && !url.includes('='), 'base64url is url-safe & unpadded');
});

// --- current_time ---
t('current_time: unix + unix_ms are numeric and consistent', () => {
  const now = new Date('2026-07-02T12:00:00Z');
  assert.equal(formatTime('UTC', 'unix', now), '1782993600');
  assert.equal(formatTime('UTC', 'unix_ms', now), '1782993600000');
});
t('current_time: iso UTC ends with Z', () => {
  const now = new Date('2026-07-02T12:00:00Z');
  assert.equal(formatTime('UTC', 'iso', now), '2026-07-02T12:00:00Z');
});
t('current_time: iso Europe/Berlin carries a +02:00 summer offset', () => {
  const now = new Date('2026-07-02T12:00:00Z');
  const s = formatTime('Europe/Berlin', 'iso', now);
  assert.equal(s, '2026-07-02T14:00:00+02:00');
});
t('current_time: invalid timezone throws (server maps to isError)', () => {
  assert.throws(() => formatTime('Mars/Olympus', 'iso', new Date()));
});

console.log(`\nAll generator tests passed (${n} checks).`);
