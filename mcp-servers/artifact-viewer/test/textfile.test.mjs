/**
 * textfile.test.mjs — tests getText/readTextFile hardening.
 * Imports compiled JS from dist/. Run after `npm run build`.
 */
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const dist = join(__dir, '..', 'dist', 'textfile.js');

if (!existsSync(dist)) {
  console.error('dist/textfile.js not found — run npm run build first');
  process.exit(1);
}
const { getText, readTextFile } = await import(dist);

// Test 1: inline content wins
{
  assert.equal(getText({ content: 'hello' }), 'hello');
  console.log('✓ Test 1: inline content');
}

// Test 2: neither content nor source → clear error
{
  assert.throws(() => getText({}), /Provide either/);
  console.log('✓ Test 2: missing input throws clearly');
}

// Test 2b: empty-string content is valid input and wins over source
{
  assert.equal(getText({ content: '' }), '');
  assert.equal(getText({ content: '', source: '/no/such/file' }), '');
  console.log('✓ Test 2b: empty content is honored');
}

// Test 3: read existing file via source
{
  const dir = mkdtempSync(join(tmpdir(), 'av-'));
  const f = join(dir, 'note.md');
  writeFileSync(f, '# Title');
  assert.equal(getText({ source: f }), '# Title');
  unlinkSync(f); rmdirSync(dir);
  console.log('✓ Test 3: read existing file');
}

// Test 4: missing file → clear "File not found"
{
  assert.throws(() => readTextFile('/no/such/file-xyz.md'), /File not found/);
  console.log('✓ Test 4: missing file error');
}

// Test 5: directory path → "Not a regular file"
{
  const dir = mkdtempSync(join(tmpdir(), 'av-'));
  assert.throws(() => readTextFile(dir), /Not a regular file/);
  rmdirSync(dir);
  console.log('✓ Test 5: directory rejected');
}

console.log('\nAll textfile tests passed.');
