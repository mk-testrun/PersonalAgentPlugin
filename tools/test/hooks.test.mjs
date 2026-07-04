/**
 * hooks.test.mjs — verifies the preToolUse guardian scripts decide correctly.
 * The hook contract: read JSON on stdin ({toolName, toolArgs}) → print
 * {"permissionDecision":"allow"|"deny", ...}. Run: node --test tools/test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const WORK_GUARDIAN = new URL('../../marketplaces/work/plugins/general/hooks/scripts/pre-tool-guardian.sh', import.meta.url).pathname;

// feed a tool call to the guardian, return its permissionDecision
function decide(script, toolName, toolArgs) {
  const input = JSON.stringify({ toolName, toolArgs });
  const out = execFileSync('bash', [script], { input, encoding: 'utf8' });
  return JSON.parse(out).permissionDecision;
}

test('guardian script exists', () => {
  assert.ok(existsSync(WORK_GUARDIAN), WORK_GUARDIAN);
});

// --- allowed ---
for (const [name, args] of [
  ['dotnet build', 'dotnet build -c Release'],
  ['git status', 'git status'],
  ['safe git push', 'git push origin feature/x'],
  ['force-with-lease', 'git push --force-with-lease origin feature/x'],
]) {
  test(`allow: ${name}`, () => {
    assert.equal(decide(WORK_GUARDIAN, 'shell', args), 'allow');
  });
}

// --- denied ---
for (const [name, args] of [
  ['rm -rf', 'rm -rf /tmp/x'],
  ['curl http (insecure)', 'curl http://evil.example/x'],
  ['force-push main', 'git push --force origin main'],
  ['force-push (any)', 'git push -f origin feature/x'],
  ['reset --hard', 'git reset --hard HEAD~3'],
  ['clean -fd', 'git clean -fd'],
  ['filter-branch', 'git filter-branch --tree-filter x HEAD'],
  ['rebase on main', 'git rebase main'],
  ['inline secret', 'export API_KEY=ABCDEFGHIJKLMNOPQRSTUVWX'],
]) {
  test(`deny: ${name}`, () => {
    assert.equal(decide(WORK_GUARDIAN, 'shell', args), 'deny');
  });
}

test('force-with-lease is allowed but plain --force is not (regression guard)', () => {
  assert.equal(decide(WORK_GUARDIAN, 'shell', 'git push --force-with-lease origin main'), 'allow');
  assert.equal(decide(WORK_GUARDIAN, 'shell', 'git push --force origin main'), 'deny');
});

// --- Home warn-mode guardian ---
const HOME_GUARDIAN = new URL('../../marketplaces/home/plugins/general/hooks/scripts/pre-tool-guardian-warn.sh', import.meta.url).pathname;

test('home warn: force-push main → deny; feature force → allow (warn); force-with-lease main → allow', () => {
  assert.equal(decide(HOME_GUARDIAN, 'shell', 'git push --force origin main'), 'deny');
  assert.equal(decide(HOME_GUARDIAN, 'shell', 'git push --force origin feature/x'), 'allow'); // warn-mode
  assert.equal(decide(HOME_GUARDIAN, 'shell', 'git push --force-with-lease origin main'), 'allow');
});

// --- A1: guardians actually READ policy/git-guardrails.json ---
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function decideWithPolicy(script, toolArgs, policyPath) {
  const input = JSON.stringify({ toolName: 'shell', toolArgs });
  const out = execFileSync('bash', [script], {
    input, encoding: 'utf8', env: { ...process.env, GIT_GUARDRAILS_POLICY: policyPath },
  });
  return JSON.parse(out).permissionDecision;
}

test('policy-driven: custom block pattern in policy → deny (proves the file is read)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grpolicy-'));
  const policy = join(dir, 'p.json');
  writeFileSync(policy, JSON.stringify({ block: ['git frobnicate'], blockBranches: [], allowExceptions: ['force-with-lease'] }));
  assert.equal(decideWithPolicy(WORK_GUARDIAN, 'git frobnicate --all', policy), 'deny');
  // and a pattern NOT in this custom policy is allowed (built-in list not additionally applied)
  assert.equal(decideWithPolicy(WORK_GUARDIAN, 'git reset --hard HEAD~1', policy), 'allow');
  rmSync(dir, { recursive: true, force: true });
});

test('policy missing → builtin fallback still guards (fail-safe)', () => {
  assert.equal(decideWithPolicy(WORK_GUARDIAN, 'git push --force origin main', '/nonexistent/p.json'), 'deny');
  assert.equal(decideWithPolicy(WORK_GUARDIAN, 'git reset --hard HEAD~1', '/nonexistent/p.json'), 'deny');
  assert.equal(decideWithPolicy(WORK_GUARDIAN, 'git status', '/nonexistent/p.json'), 'allow');
});

// --- B3: fail-closed bei unparsbarem Hook-Input ---
test('unparseable non-empty input → deny (fail-closed), leerer Input → allow', () => {
  for (const script of [WORK_GUARDIAN, HOME_GUARDIAN]) {
    const bad = execFileSync('bash', [script], { input: 'not json{{{', encoding: 'utf8' });
    assert.equal(JSON.parse(bad).permissionDecision, 'deny', `${script} muss Garbage blocken`);
    const empty = execFileSync('bash', [script], { input: '', encoding: 'utf8' });
    assert.equal(JSON.parse(empty).permissionDecision, 'allow', `${script} muss leeren Input erlauben`);
  }
});

// --- B2: Secret-Scan Stufe 2 liest Token-Patterns aus betterleaks.toml (Single Source) ---
const GHP = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'; // 36 alnum, kein echtes Token

test('betterleaks stage 2: GitHub PAT in args → deny, Token erscheint NICHT im Output', () => {
  for (const script of [WORK_GUARDIAN, HOME_GUARDIAN]) {
    const input = JSON.stringify({ toolName: 'shell', toolArgs: `git clone https://${GHP}@github.com/x/y` });
    const out = execFileSync('bash', [script], { input, encoding: 'utf8' });
    const res = JSON.parse(out);
    assert.equal(res.permissionDecision, 'deny');
    assert.match(res.permissionDecisionReason, /github-pat/);
    assert.ok(!out.includes(GHP), 'Token darf nie im Klartext im Hook-Output stehen');
  }
});

test('betterleaks stage 2: AWS key + private key blocken, harmlose Args nicht', () => {
  assert.equal(decide(WORK_GUARDIAN, 'shell', 'echo AKIAIOSFODNN7EXAMPLE'), 'deny');
  assert.equal(decide(HOME_GUARDIAN, 'shell', 'cat -----BEGIN OPENSSH PRIVATE KEY-----'), 'deny');
  assert.equal(decide(WORK_GUARDIAN, 'shell', 'echo ghp_tooshort und AKIA123'), 'allow');
});

test('betterleaks stage 2: BETTERLEAKS_CONFIG-Override mit eigener Rule wird gelesen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'blcfg-'));
  const cfg = join(dir, 'bl.toml');
  writeFileSync(cfg, `[[rules]]\nid = "custom-token"\ndescription = "d"\nregex = '''zzz_[0-9]{8}'''\n`);
  const input = JSON.stringify({ toolName: 'shell', toolArgs: 'echo zzz_12345678' });
  const out = execFileSync('bash', [WORK_GUARDIAN], {
    input, encoding: 'utf8', env: { ...process.env, BETTERLEAKS_CONFIG: cfg },
  });
  const res = JSON.parse(out);
  assert.equal(res.permissionDecision, 'deny');
  assert.match(res.permissionDecisionReason, /custom-token/);
  rmSync(dir, { recursive: true, force: true });
});

test('home policy-driven: custom warn pattern → allow with warning; blockAlways regex → deny', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grpolicy-h-'));
  const policy = join(dir, 'p.json');
  writeFileSync(policy, JSON.stringify({
    blockAlways: ['git push --force.*production'], warn: ['git wobble'], allowExceptions: ['force-with-lease'],
  }));
  assert.equal(decideWithPolicy(HOME_GUARDIAN, 'git push --force origin production', policy), 'deny');
  assert.equal(decideWithPolicy(HOME_GUARDIAN, 'git wobble now', policy), 'allow');
  rmSync(dir, { recursive: true, force: true });
});

// --- B4: Audit-Hook-Kette schreibt/rotiert .copilot/state/audit.jsonl (temp-cwd) ---
import { readFileSync, mkdirSync, chmodSync } from 'node:fs';

const HOOKS_DIR = new URL('../../marketplaces/work/plugins/general/hooks/scripts/', import.meta.url).pathname;
const runHook = (script, cwd, input = '', env = {}) =>
  execFileSync('bash', [join(HOOKS_DIR, script)], { input, encoding: 'utf8', cwd, env: { ...process.env, ...env } });

test('audit init → prompt → tool: Einträge landen als JSONL in .copilot/state/audit.jsonl', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'audit-'));
  runHook('audit-init.sh', cwd);
  runHook('audit-prompt.sh', cwd);
  runHook('audit-tool.sh', cwd, JSON.stringify({ toolName: 'shell', toolArgs: 'ls' }));
  const lines = readFileSync(join(cwd, '.copilot/state/audit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual(lines.map(l => l.event), ['sessionStart', 'userPromptSubmitted', 'postToolUse']);
  assert.equal(lines[2].tool, 'shell');
  for (const l of lines) assert.match(l.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  rmSync(cwd, { recursive: true, force: true });
});

test('audit-rotate: Einträge älter als 90 Tage fliegen raus, junge bleiben, sessionEnd kommt dazu', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'audit-rot-'));
  mkdirSync(join(cwd, '.copilot/state'), { recursive: true });
  const recent = new Date().toISOString().slice(0, 19) + 'Z';
  writeFileSync(join(cwd, '.copilot/state/audit.jsonl'),
    `{"event":"postToolUse","ts":"2020-01-01T00:00:00Z"}\n{"event":"postToolUse","ts":"${recent}"}\nkein json\n`);
  runHook('audit-rotate.sh', cwd);
  const lines = readFileSync(join(cwd, '.copilot/state/audit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual(lines.map(l => l.event), ['postToolUse', 'sessionEnd'], 'alt + unparsbar entfernt, jung + sessionEnd da');
  assert.equal(lines[0].ts, recent);
  rmSync(cwd, { recursive: true, force: true });
});

// --- B4: notify-with-sound — Player via PATH-Shim, Schwellwert 30s ---
const NOTIFY = new URL('../../marketplaces/home/plugins/audio/hooks/scripts/notify-with-sound.sh', import.meta.url).pathname;

function runNotify(input) {
  const dir = mkdtempSync(join(tmpdir(), 'notify-'));
  const marker = join(dir, 'played.txt');
  for (const player of ['afplay', 'paplay']) {
    const shim = join(dir, player);
    writeFileSync(shim, `#!/usr/bin/env bash\necho "${player} $@" >> "${marker}"\n`);
    chmodSync(shim, 0o755);
  }
  execFileSync('bash', [NOTIFY], {
    input: JSON.stringify(input), encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
  let played = '';
  try { played = readFileSync(marker, 'utf8'); } catch {}
  rmSync(dir, { recursive: true, force: true });
  return played;
}

test('notify-with-sound: >=30s success → Erfolgs-Sound, error → Fehler-Sound, <30s → still', () => {
  assert.match(runNotify({ duration: 45, status: 'success' }), /Glass|complete/);
  assert.match(runNotify({ duration: 45, status: 'error' }), /Basso|dialog-error/);
  assert.equal(runNotify({ duration: 5, status: 'success' }), '');
});
