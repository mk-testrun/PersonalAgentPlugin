#!/usr/bin/env node
/**
 * run-state.mjs — deterministic orchestrator state machine (Home variant).
 *
 * Same anti-drift idea as Work: workflow STEPS live in code, runs are resumable via a JSON state file.
 * Home has no ADO/Blazor/testing plugins and no /ship — workflows are GitHub-flavored and delegate to
 * general (GitHub/git) and reviewer (review matrix). Two-worlds principle: this is Home's own copy.
 *
 * Commands: init --workflow <name> [--title][--dir] · show <file> · resume <file> · advance <file> [--status][--note]
 * Markers: [CONFIRM] (yes/no before mutating) · [GATE] (hard stop on critical/high).
 * Exit: 0 ok · 2 usage/unknown workflow · 3 run-file/step error.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const errMsg = e => (e instanceof Error ? e.message : String(e));

const WORKFLOWS = {
  feature: {
    description: 'Issue → Branch → Implementierung → Review → PR (GitHub)',
    steps: [
      { id: 'resolve',   title: 'Issue read-only auflösen',                       delegate: 'general',  gate: 'confirm' },
      { id: 'branch',    title: 'Idempotenz-Check + Branch feature/<slug>',        delegate: 'general',  gate: 'confirm' },
      { id: 'implement', title: 'Implementierung (Multi-Lang-Conventions)',        delegate: 'general',  gate: 'confirm' },
      { id: 'review',    title: 'Diff-Review (Security/WCAG/Deps/Perf)',           delegate: 'reviewer', gate: 'gate' },
      { id: 'pr',        title: 'PR öffnen (GitHub)',                              delegate: 'general',  gate: 'confirm' },
    ],
  },
  bugfix: {
    description: 'Repro → Fix → Review → PR (GitHub)',
    steps: [
      { id: 'repro',   title: 'Bug reproduzieren, Ursache eingrenzen (read-only)',  delegate: 'general',  gate: 'confirm' },
      { id: 'branch',  title: 'Branch fix/<slug>',                                  delegate: 'general',  gate: 'confirm' },
      { id: 'fix',     title: 'Fix implementieren',                                 delegate: 'general',  gate: 'confirm' },
      { id: 'review',  title: 'Diff-Review (Regressions-Fokus)',                    delegate: 'reviewer', gate: 'gate' },
      { id: 'pr',      title: 'PR öffnen (GitHub)',                                 delegate: 'general',  gate: 'confirm' },
    ],
  },
  'review-flow': {
    description: 'Vollständige Review-Matrix auf den Diff → findings[] + Report',
    steps: [
      { id: 'scope',     title: 'Diff-Scope bestimmen',                             delegate: 'reviewer', gate: null },
      { id: 'matrix',    title: 'Review-Matrix (WCAG/BFSG/Security/Deps/AI-Readiness)', delegate: 'reviewer', gate: null },
      { id: 'aggregate', title: 'findings[] aggregieren + Report',                  delegate: 'reviewer', gate: 'gate' },
    ],
  },
};

const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter(a => !a.startsWith('--'));
const opt = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const die = (code, msg) => { process.stderr.write(`run-state: ${msg}\n`); process.exit(code); };
function runId() { const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }
function loadRun(file) { if (!file || !existsSync(file)) die(3, `run-file not found: ${file}`);
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { die(3, `bad run-file (${errMsg(e)})`); } }
const markerLabel = g => (g === 'gate' ? ' [GATE]' : g === 'confirm' ? ' [CONFIRM]' : '');
const planLines = wf => wf.steps.map((s, i) => `  ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}`);

if (cmd === 'init') {
  const name = opt('workflow');
  if (!name || !WORKFLOWS[name]) die(2, `unknown --workflow (use: ${Object.keys(WORKFLOWS).join(', ')})`);
  const wf = WORKFLOWS[name];
  const dir = opt('dir', join('.copilot', 'state', 'artifacts'));
  const id = runId();
  const run = { workflow: name, runId: id, title: opt('title', ''), createdAt: new Date().toISOString(),
    description: wf.description, steps: wf.steps.map(s => ({ ...s, status: 'pending' })), cursor: 0 };
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `orchestrator-${name}-${id}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2));
  process.stdout.write(`Workflow: ${name} — ${wf.description}\nRun-ID: ${id}\nState: ${file}\n\nDry-run-Plan:\n${planLines(wf).join('\n')}\n\n[CONFIRM] = Stopp für Ja/Nein · [GATE] = harter Stopp bei critical/high.\nWeiter: run-state.mjs resume "${file}"\n`);
  process.exit(0);
}
if (cmd === 'show') {
  const run = loadRun(positional[0]);
  const rows = run.steps.map((s, i) => {
    const mark = i === run.cursor ? '▶' : s.status === 'done' ? '✓' : s.status === 'blocked' ? '✗' : s.status === 'skipped' ? '↷' : ' ';
    return ` ${mark} ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}${s.note ? `  (${s.note})` : ''}`;
  });
  process.stdout.write(`Workflow ${run.workflow} (${run.runId})${run.title ? ` — ${run.title}` : ''}\n${rows.join('\n')}\n`);
  process.exit(0);
}
if (cmd === 'resume') {
  const run = loadRun(positional[0]);
  const i = run.steps.findIndex(s => s.status === 'pending');
  if (i === -1) { process.stdout.write(`✓ Workflow ${run.workflow} (${run.runId}): alle Schritte erledigt.\n`); process.exit(0); }
  const s = run.steps[i];
  process.stdout.write(`Nächster Schritt ${i + 1}/${run.steps.length}: ${s.title}\nDelegieren an: ${s.delegate}\n` +
    (s.gate === 'gate' ? `[GATE] — bei critical/high hart stoppen.\n` : s.gate === 'confirm' ? `[CONFIRM] — vor Ausführung Ja/Nein einholen.\n` : `(kein Gate)\n`));
  process.exit(0);
}
if (cmd === 'advance') {
  const file = positional[0];
  const run = loadRun(file);
  const i = run.steps.findIndex(s => s.status === 'pending');
  if (i === -1) die(3, 'keine offenen Schritte mehr');
  const status = opt('status', 'done');
  if (!['done', 'blocked', 'skipped'].includes(status)) die(2, `--status muss done|blocked|skipped sein`);
  run.steps[i].status = status;
  const note = opt('note'); if (note) run.steps[i].note = note;
  run.cursor = Math.min(i + 1, run.steps.length - 1);
  writeFileSync(file, JSON.stringify(run, null, 2));
  const done = run.steps.filter(s => s.status === 'done').length;
  process.stdout.write(`Schritt ${i + 1} → ${status}. (${done}/${run.steps.length} done)\n`);
  if (status === 'blocked') process.stdout.write(`⚠ blockiert — Workflow hält hier an.\n`);
  process.exit(0);
}
die(2, `usage: run-state.mjs init|show|resume|advance … (workflows: ${Object.keys(WORKFLOWS).join(', ')})`);
