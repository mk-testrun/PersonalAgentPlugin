/**
 * run-evals.test.mjs — structural eval-runner checks. Run: node --test tools/test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RUNNER = new URL('../run-evals.mjs', import.meta.url).pathname;

// build a temp marketplace with one plugin whose skill has the given cases.json content
function marketplaceWithCases(casesText) {
  const mp = mkdtempSync(join(tmpdir(), 're-mp-'));
  const sk = join(mp, 'plugins', 'x', 'skills', 's', 'evals');
  mkdirSync(sk, { recursive: true });
  if (casesText !== null) writeFileSync(join(sk, 'cases.json'), casesText);
  return mp;
}
function runExit(mp) {
  try { execFileSync('node', [RUNNER, mp], { encoding: 'utf8' }); return 0; }
  catch (e) { return e.status ?? 1; }
}

const okCase = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({
  skill: 's', query: `q${i}`, expected_behavior: ['does a thing'],
})));

test('valid cases.json (>=3, query, expected_behavior) → exit 0', () => {
  assert.equal(runExit(marketplaceWithCases(okCase)), 0);
});

test('fewer than 3 cases → exit 1', () => {
  const two = JSON.stringify([{ skill: 's', query: 'q', expected_behavior: ['x'] }, { skill: 's', query: 'q2', expected_behavior: ['y'] }]);
  assert.equal(runExit(marketplaceWithCases(two)), 1);
});

test('case missing expected_behavior → exit 1', () => {
  const bad = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({ skill: 's', query: `q${i}` })));
  assert.equal(runExit(marketplaceWithCases(bad)), 1);
});

test('case with missing fixture file → exit 1', () => {
  const withFixture = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({
    skill: 's', query: `q${i}`, expected_behavior: ['x'], files: ['fixtures/nope.json'],
  })));
  assert.equal(runExit(marketplaceWithCases(withFixture)), 1);
});

test('invalid JSON → exit 1', () => {
  assert.equal(runExit(marketplaceWithCases('{ not json')), 1);
});

test('marketplace with no evals at all → exit 0 (nothing to fail)', () => {
  assert.equal(runExit(marketplaceWithCases(null)), 0);
});

test('valid optional contract fields (expected_tools/gates/confirmations) → exit 0', () => {
  const withContract = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({
    skill: 's', query: `q${i}`, expected_behavior: ['x'],
    expected_tools: ['execute'], expected_gates: ['review'], expected_confirmations: 2,
  })));
  assert.equal(runExit(marketplaceWithCases(withContract)), 0);
});

test('malformed contract field (expected_confirmations as string) → exit 1', () => {
  const bad = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({
    skill: 's', query: `q${i}`, expected_behavior: ['x'], expected_confirmations: 'two',
  })));
  assert.equal(runExit(marketplaceWithCases(bad)), 1);
});
