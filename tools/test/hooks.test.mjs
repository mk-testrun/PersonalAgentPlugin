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
