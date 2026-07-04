#!/usr/bin/env node
/**
 * run-state.mjs — deterministic orchestrator state machine.
 *
 * The workflow STEPS live in workflows.json NEXT TO this script, not in a prompt — that is the
 * anti-drift core: the model reads the plan and the "next step" from data instead of re-inventing
 * the choreography each run. State is a JSON run-file under the artifacts dir (resumable).
 * The SCRIPT is byte-identical in Work and Home (CI enforces it); only workflows.json differs
 * per marketplace (two-worlds principle: shared engine, world-specific choreography).
 *
 * Commands:
 *   init     --workflow <name> [--title "..."] [--dir DIR]  → create run-file, print dry-run plan + run-id
 *   show     <run-file>                                      → print all steps with status + current pointer
 *   resume   <run-file>                                      → print the next pending step (delegate + gate)
 *   advance  <run-file> [--status done|blocked|skipped] [--note "..."]  → complete current step (atomic write)
 *   list     [--dir DIR]                                     → all run-files with progress
 *   prune    [--dir DIR] [--keep N]                          → delete finished runs, keep newest N (default 5)
 *   describe [--markdown]                                    → workflows as text/markdown (docs from code)
 *
 * Markers: [CONFIRM] = stop for yes/no before a mutating step · [GATE] = hard stop on critical/high.
 * Steps with "optional": true may be skipped via advance --status skipped without breaking the flow.
 * Exit: 0 ok · 2 bad usage/unknown workflow · 3 run-file/step error.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const errMsg = e => (e instanceof Error ? e.message : String(e));
const __dir = dirname(fileURLToPath(import.meta.url));

// --- workflow definitions: data, not code (workflows.json neben dem Skript) ---
let WORKFLOWS;
try { WORKFLOWS = JSON.parse(readFileSync(join(__dir, 'workflows.json'), 'utf8')); }
catch (e) { process.stderr.write(`run-state: workflows.json unlesbar (${errMsg(e)})\n`); process.exit(3); }

// --- args ---
const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter(a => !a.startsWith('--'));
function opt(name, def = null) {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
}
const hasFlag = name => argv.includes(`--${name}`);
const die = (code, msg) => { process.stderr.write(`run-state: ${msg}\n`); process.exit(code); };

function runId() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function loadRun(file) {
  if (!file || !existsSync(file)) die(3, `run-file not found: ${file}`);
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { die(3, `bad run-file (${errMsg(e)})`); }
}
// Atomar: erst tmp schreiben, dann rename — ein Abbruch mitten im Write hinterlässt nie einen
// korrupten (= nicht mehr resumebaren) Run-State.
function saveRun(file, run) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(run, null, 2));
  renameSync(tmp, file);
}
function markerLabel(g) { return g === 'gate' ? ' [GATE]' : g === 'confirm' ? ' [CONFIRM]' : ''; }
function planLines(wf) {
  return wf.steps.map((s, i) => `  ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}${s.optional ? ' (optional)' : ''}`);
}
const isFinished = run => run.steps.every(s => s.status !== 'pending');

// --- commands ---
if (cmd === 'init') {
  const name = opt('workflow');
  if (!name || !WORKFLOWS[name]) die(2, `unknown --workflow (use: ${Object.keys(WORKFLOWS).join(', ')})`);
  const wf = WORKFLOWS[name];
  const dir = opt('dir', join('.copilot', 'state', 'artifacts'));
  const id = runId();
  const run = {
    workflow: name, runId: id, title: opt('title', ''), createdAt: new Date().toISOString(),
    description: wf.description,
    steps: wf.steps.map(s => ({ ...s, status: 'pending' })),
    cursor: 0,
  };
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `orchestrator-${name}-${id}.json`);
  saveRun(file, run);
  process.stdout.write(
    `Workflow: ${name} — ${wf.description}\n` +
    `Run-ID: ${id}\nState: ${file}\n\nDry-run-Plan:\n${planLines(wf).join('\n')}\n\n` +
    `[CONFIRM] = Stopp für Ja/Nein vor mutierendem Schritt · [GATE] = harter Stopp bei critical/high.\n` +
    `Weiter: run-state.mjs resume "${file}"\n`,
  );
  process.exit(0);
}

if (cmd === 'show') {
  const file = positional[0];
  const run = loadRun(file);
  const rows = run.steps.map((s, i) => {
    const mark = i === run.cursor ? '▶' : s.status === 'done' ? '✓' : s.status === 'blocked' ? '✗' : s.status === 'skipped' ? '↷' : ' ';
    return ` ${mark} ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}${s.optional ? ' (optional)' : ''}${s.note ? `  (${s.note})` : ''}`;
  });
  process.stdout.write(`Workflow ${run.workflow} (${run.runId})${run.title ? ` — ${run.title}` : ''}\n${rows.join('\n')}\n`);
  process.exit(0);
}

if (cmd === 'resume') {
  const file = positional[0];
  const run = loadRun(file);
  const i = run.steps.findIndex(s => s.status === 'pending');
  if (i === -1) { process.stdout.write(`✓ Workflow ${run.workflow} (${run.runId}): alle Schritte erledigt.\n`); process.exit(0); }
  const s = run.steps[i];
  process.stdout.write(
    `Nächster Schritt ${i + 1}/${run.steps.length}: ${s.title}\n` +
    `Delegieren an: ${s.delegate}\n` +
    (s.gate === 'gate' ? `[GATE] — bei critical/high hart stoppen.\n`
      : s.gate === 'confirm' ? `[CONFIRM] — vor Ausführung Ja/Nein einholen.\n` : `(kein Gate)\n`) +
    (s.optional ? `(optional — überspringen mit: advance --status skipped)\n` : ''),
  );
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
  const note = opt('note');
  if (note) run.steps[i].note = note;
  run.cursor = Math.min(i + 1, run.steps.length - 1);
  saveRun(file, run);
  const done = run.steps.filter(s => s.status === 'done').length;
  process.stdout.write(`Schritt ${i + 1} → ${status}. (${done}/${run.steps.length} done)\n`);
  if (status === 'blocked') process.stdout.write(`⚠ blockiert — Workflow hält hier an.\n`);
  process.exit(0);
}

if (cmd === 'list') {
  const dir = opt('dir', join('.copilot', 'state', 'artifacts'));
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith('orchestrator-') && f.endsWith('.json')).sort() : [];
  if (!files.length) { process.stdout.write(`(keine Runs unter ${dir})\n`); process.exit(0); }
  for (const f of files) {
    try {
      const run = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const done = run.steps.filter(s => s.status !== 'pending').length;
      const state = isFinished(run) ? 'fertig' : run.steps.some(s => s.status === 'blocked') ? 'BLOCKIERT' : 'offen';
      process.stdout.write(`${state.padEnd(9)} ${run.workflow.padEnd(12)} ${done}/${run.steps.length}  ${join(dir, f)}${run.title ? `  — ${run.title}` : ''}\n`);
    } catch { process.stdout.write(`korrupt   ${join(dir, f)}\n`); }
  }
  process.exit(0);
}

if (cmd === 'prune') {
  const dir = opt('dir', join('.copilot', 'state', 'artifacts'));
  const keep = Number(opt('keep', '5'));
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith('orchestrator-') && f.endsWith('.json')).sort() : [];
  // Nur abgeschlossene Runs löschen; die neuesten `keep` bleiben immer (auch wenn fertig).
  const finished = files.filter(f => {
    try { return isFinished(JSON.parse(readFileSync(join(dir, f), 'utf8'))); } catch { return false; }
  });
  const toDelete = finished.slice(0, Math.max(0, finished.length - keep));
  for (const f of toDelete) unlinkSync(join(dir, f));
  process.stdout.write(`prune: ${toDelete.length} abgeschlossene Run(s) gelöscht, ${files.length - toDelete.length} behalten.\n`);
  process.exit(0);
}

if (cmd === 'describe') {
  if (hasFlag('markdown')) {
    const out = ['# Workflows (generiert aus workflows.json — nicht von Hand pflegen)', ''];
    for (const [name, wf] of Object.entries(WORKFLOWS)) {
      out.push(`## ${name}`, '', wf.description, '', '| # | Schritt | Delegat | Gate |', '|---|---|---|---|');
      wf.steps.forEach((s, i) => out.push(`| ${i + 1} | ${s.title}${s.optional ? ' *(optional)*' : ''} | ${s.delegate} | ${s.gate ?? '—'} |`));
      out.push('');
    }
    process.stdout.write(out.join('\n'));
  } else {
    for (const [name, wf] of Object.entries(WORKFLOWS)) {
      process.stdout.write(`${name} — ${wf.description}\n${planLines(wf).join('\n')}\n\n`);
    }
  }
  process.exit(0);
}

die(2, `usage: run-state.mjs init|show|resume|advance|list|prune|describe … (workflows: ${Object.keys(WORKFLOWS).join(', ')})`);
