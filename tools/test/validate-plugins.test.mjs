/**
 * validate-plugins.test.mjs — exercises the tiered validator (error/warning/hint) + scoped runs.
 * Run: node --test tools/test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VALIDATOR = new URL('../validate-plugins.mjs', import.meta.url).pathname;

// run the validator in --format json and return the parsed findings
function run(args) {
  let out = '';
  try { out = execFileSync('node', [VALIDATOR, ...args, '--format', 'json'], { encoding: 'utf8' }); }
  catch (e) { out = e.stdout || ''; }        // exit 1 still prints JSON to stdout
  return JSON.parse(out);
}

function skillDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'vp-skill-'));
  mkdirSync(join(dir, 'skills', 's'), { recursive: true });
  writeFileSync(join(dir, 'skills', 's', 'SKILL.md'), files.skill);
  return join(dir, 'skills', 's');
}
function agentFile(body) {
  const dir = mkdtempSync(join(tmpdir(), 'vp-agent-'));
  mkdirSync(join(dir, 'agents'), { recursive: true });
  const f = join(dir, 'agents', 'a.agent.md');
  writeFileSync(f, body);
  return f;
}
const fm = (extra = '') => `---\nname: s\ndescription: ${'x'.repeat(210)} Use when testing things with mcp.\n${extra}---\nbody\n`;

test('valid skill → no errors/warnings/hints', () => {
  const r = run(['--skill', skillDir({ skill: fm() })]);
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.hints.length, 0);
});

test('missing description → error', () => {
  const r = run(['--skill', skillDir({ skill: '---\nname: s\n---\nbody\n' })]);
  assert.ok(r.errors.some(e => /missing "description"/.test(e)), r.errors.join('|'));
});

test('applyTo → hint (VS Code), not error', () => {
  const r = run(['--skill', skillDir({ skill: fm('applyTo: ["**/*.cs"]\n') })]);
  assert.equal(r.errors.length, 0);
  assert.ok(r.hints.some(h => /applyTo/.test(h) && /VS Code/.test(h)), r.hints.join('|'));
});

test('mcp_tools → warning (nowhere), not error', () => {
  const r = run(['--skill', skillDir({ skill: fm('mcp_tools: [x]\n') })]);
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some(w => /mcp_tools/.test(w)), r.warnings.join('|'));
});

test('allowed-tools → warning naming Claude Code', () => {
  const r = run(['--skill', skillDir({ skill: fm('allowed-tools: [Read]\n') })]);
  assert.ok(r.warnings.some(w => /allowed-tools/.test(w) && /Claude/.test(w)), r.warnings.join('|'));
});

test('agent editFiles → warning (VS Code), valid tools → ok', () => {
  const r = run(['--agent', agentFile('---\nname: a\ndescription: d\ntools:\n  - edit\n  - editFiles\n  - github.issues\nmodel: gpt-5\n---\nb\n')]);
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some(w => /editFiles/.test(w) && /VS Code/.test(w)), r.warnings.join('|'));
  assert.ok(r.warnings.some(w => /github\.issues/.test(w)), 'dot-namespaced flagged');
  assert.ok(!r.warnings.some(w => /"edit"/.test(w)), 'valid alias not flagged');
});

test('--strict promotes warnings to failure', () => {
  const dir = skillDir({ skill: fm('mcp_tools: [x]\n') });
  let code = 0;
  try { execFileSync('node', [VALIDATOR, '--skill', dir, '--strict'], { stdio: 'ignore' }); }
  catch (e) { code = e.status; }
  assert.equal(code, 1);
});

test('marketplace/plugin version drift → warning', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vp-mp-'));
  mkdirSync(join(dir, '.github', 'plugin'), { recursive: true });
  mkdirSync(join(dir, 'plugins', 'p', '.github', 'plugin'), { recursive: true });
  writeFileSync(join(dir, '.github', 'plugin', 'marketplace.json'), JSON.stringify({
    name: 'mp', metadata: { description: 'd', version: '1.0.0' }, owner: { name: 'o' },
    plugins: [{ name: 'p', source: 'plugins/p', description: 'd', version: '1.0.0' }],
  }));
  writeFileSync(join(dir, 'plugins', 'p', '.github', 'plugin', 'plugin.json'),
    JSON.stringify({ name: 'p', description: 'd', version: '1.1.0', author: { name: 'a' }, license: 'MIT', repository: 'r' }));
  const r = run([dir]);
  assert.ok(r.warnings.some(w => /Version drift/.test(w) && /1\.0\.0/.test(w) && /1\.1\.0/.test(w)), r.warnings.join('|'));
  rmSync(dir, { recursive: true, force: true });
});

test('hooks.json old array shape → error (via plugin scope)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vp-plugin-'));
  mkdirSync(join(dir, '.github', 'plugin'), { recursive: true });
  writeFileSync(join(dir, '.github', 'plugin', 'plugin.json'),
    JSON.stringify({ name: 'x', description: 'd', version: '1.0.0', author: { name: 'a' }, license: 'MIT', repository: 'r' }));
  writeFileSync(join(dir, 'hooks.json'), JSON.stringify({ hooks: [{ event: 'postToolUse', script: 'x.sh' }] }));
  const r = run(['--plugin', dir]);
  assert.ok(r.errors.some(e => /hooks\.json/.test(e)), r.errors.join('|'));
  rmSync(dir, { recursive: true, force: true });
});
