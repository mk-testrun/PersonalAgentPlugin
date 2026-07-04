/**
 * run-state.test.mjs — der Orchestrator-Zustandsautomat (workflow-router).
 * Prüft: init/resume/advance-Zyklus, optionale Schritte, atomare Writes,
 * list/prune/describe und die Work↔Home-Code-Gleichheit (Engine identisch,
 * nur workflows.json unterscheidet sich). Run: node --test tools/test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WORK = new URL('../../marketplaces/work/plugins/orchestration/skills/workflow-router/scripts/run-state.mjs', import.meta.url).pathname;
const HOME = new URL('../../marketplaces/home/plugins/orchestration/skills/workflow-router/scripts/run-state.mjs', import.meta.url).pathname;

function run(script, args, expectFail = false) {
  try { return { out: execFileSync('node', [script, ...args], { encoding: 'utf8' }), code: 0 }; }
  catch (e) { if (!expectFail) throw e; return { out: (e.stdout ?? '') + (e.stderr ?? ''), code: e.status }; }
}

test('engine code equality: Work- und Home-run-state.mjs sind byte-identisch', () => {
  assert.equal(readFileSync(WORK, 'utf8'), readFileSync(HOME, 'utf8'),
    'run-state.mjs driftet zwischen Work und Home — Engine teilen, nur workflows.json unterscheidet sich');
});

test('init → resume → advance-Zyklus bis fertig', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rs-'));
  const init = run(WORK, ['init', '--workflow', 'review-flow', '--dir', dir]).out;
  assert.match(init, /Dry-run-Plan/);
  const file = join(dir, readdirSync(dir).find(f => f.startsWith('orchestrator-')));
  assert.match(run(WORK, ['resume', file]).out, /Schritt 1\/3/);
  run(WORK, ['advance', file]);
  run(WORK, ['advance', file, '--status', 'done', '--note', 'ok']);
  run(WORK, ['advance', file]);
  assert.match(run(WORK, ['resume', file]).out, /alle Schritte erledigt/);
  const state = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(state.steps[1].note, 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('optionale Schritte sind markiert und via skipped überspringbar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rs-opt-'));
  run(WORK, ['init', '--workflow', 'feature', '--dir', dir]);
  const file = join(dir, readdirSync(dir)[0]);
  for (let i = 0; i < 4; i++) run(WORK, ['advance', file]); // resolve..unit
  const resume = run(WORK, ['resume', file]).out;           // e2e ist optional
  assert.match(resume, /optional — überspringen/);
  run(WORK, ['advance', file, '--status', 'skipped']);
  assert.match(run(WORK, ['resume', file]).out, /Review/);
  rmSync(dir, { recursive: true, force: true });
});

test('advance schreibt atomar (kein .tmp-Rest) und korrupter Run-File → Exit 3', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rs-atomic-'));
  run(WORK, ['init', '--workflow', 'plan', '--dir', dir]);
  const file = join(dir, readdirSync(dir)[0]);
  run(WORK, ['advance', file]);
  assert.ok(!readdirSync(dir).some(f => f.endsWith('.tmp')), 'tmp-Datei blieb liegen');
  writeFileSync(file, 'kein json');
  assert.equal(run(WORK, ['resume', file], true).code, 3);
  rmSync(dir, { recursive: true, force: true });
});

test('list zeigt Fortschritt, prune löscht nur abgeschlossene Runs (behält --keep)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rs-list-'));
  run(WORK, ['init', '--workflow', 'review-flow', '--dir', dir]);
  const f1 = join(dir, readdirSync(dir)[0]);
  for (let i = 0; i < 3; i++) run(WORK, ['advance', f1]);   // fertig
  const state = JSON.parse(readFileSync(f1, 'utf8'));
  writeFileSync(join(dir, 'orchestrator-review-flow-x2.json'), JSON.stringify({ ...state, steps: state.steps.map(s => ({ ...s, status: 'pending' })) }));
  const list = run(WORK, ['list', '--dir', dir]).out;
  assert.match(list, /fertig/); assert.match(list, /offen/);
  const prune = run(WORK, ['prune', '--dir', dir, '--keep', '0']).out;
  assert.match(prune, /1 abgeschlossene Run\(s\) gelöscht/);
  assert.equal(readdirSync(dir).length, 1, 'offener Run bleibt');
  rmSync(dir, { recursive: true, force: true });
});

test('describe --markdown generiert Doku aus workflows.json; unbekannter Workflow → Exit 2', () => {
  const md = run(WORK, ['describe', '--markdown']).out;
  assert.match(md, /## feature/); assert.match(md, /\| Delegat \|/);
  const homeMd = run(HOME, ['describe', '--markdown']).out;
  assert.ok(!homeMd.includes('## ship'), 'Home hat kein ship-Workflow');
  assert.equal(run(WORK, ['init', '--workflow', 'nope'], true).code, 2);
});
