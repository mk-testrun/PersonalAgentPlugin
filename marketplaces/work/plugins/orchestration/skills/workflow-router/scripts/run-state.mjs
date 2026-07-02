#!/usr/bin/env node
/**
 * run-state.mjs — deterministic orchestrator state machine.
 *
 * The workflow STEPS live here in code, not in a prompt — that is the anti-drift core: the model reads
 * the plan and the "next step" from this script instead of re-inventing the choreography each run.
 * State is a JSON run-file under the artifacts dir, which makes runs resumable after an interrupt.
 *
 * Commands:
 *   init   --workflow <name> [--title "..."] [--dir DIR]   → create run-file, print dry-run plan + run-id
 *   show   <run-file>                                       → print all steps with status + current pointer
 *   resume <run-file>                                       → print the next pending step (delegate + gate)
 *   advance <run-file> [--status done|blocked|skipped] [--note "..."]  → complete current step, move pointer
 *
 * Markers: [CONFIRM] = stop for yes/no before a mutating step · [GATE] = hard stop on critical/high.
 * Exit: 0 ok · 2 bad usage/unknown workflow · 3 run-file/step error.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const errMsg = e => (e instanceof Error ? e.message : String(e));

// --- canonical workflow definitions (single source of truth) ---
// gate: 'confirm' | 'gate' | null   delegate: plugin/agent that does the work
const WORKFLOWS = {
  feature: {
    description: 'Issue → Branch → Implementierung → Tests → Review → PR',
    steps: [
      { id: 'resolve',  title: 'Issue/Anforderung read-only auflösen',                 delegate: 'general',      gate: 'confirm' },
      { id: 'branch',   title: 'Idempotenz-Check + Branch feature/AB-<id>-<slug>',       delegate: 'general',      gate: 'confirm' },
      { id: 'implement',title: 'Implementierung',                                        delegate: 'blazor',       gate: 'confirm' },
      { id: 'unit',     title: 'Unit-Tests + Coverage-Gate',                             delegate: 'testing',      gate: null },
      { id: 'e2e',      title: 'E2E (localhost, opt-in)',                                delegate: 'testing',      gate: 'gate' },
      { id: 'review',   title: 'Diff-gescopter Review (OWASP/WCAG/SQL/…)',               delegate: 'review',       gate: 'gate' },
      { id: 'pr',       title: 'PR öffnen + Work-Item verlinken',                        delegate: 'general',      gate: 'confirm' },
      { id: 'doc',      title: 'Doku/ADR (optional)',                                    delegate: 'doku',         gate: 'confirm' },
    ],
  },
  bugfix: {
    description: 'Repro → Failing-Test → Fix → grün → Review → PR',
    steps: [
      { id: 'repro',    title: 'Bug reproduzieren, Ursache eingrenzen (read-only)',      delegate: 'general',      gate: 'confirm' },
      { id: 'branch',   title: 'Branch fix/AB-<id>-<slug>',                              delegate: 'general',      gate: 'confirm' },
      { id: 'failtest', title: 'Failing-Test schreiben (reproduziert den Bug)',          delegate: 'testing',      gate: null },
      { id: 'fix',      title: 'Fix implementieren',                                     delegate: 'blazor',       gate: 'confirm' },
      { id: 'green',    title: 'Tests grün + Coverage hält',                             delegate: 'testing',      gate: 'gate' },
      { id: 'review',   title: 'Diff-Review (Regressions-Fokus)',                        delegate: 'review',       gate: 'gate' },
      { id: 'pr',       title: 'PR öffnen + Work-Item verlinken',                        delegate: 'general',      gate: 'confirm' },
    ],
  },
  'review-flow': {
    description: 'Vollständige Review-Matrix auf den aktuellen Diff → findings[] + Report',
    steps: [
      { id: 'scope',    title: 'Diff-Scope bestimmen (Branch vs. base)',                 delegate: 'review',       gate: null },
      { id: 'matrix',   title: 'Review-Matrix ausführen (Security/WCAG/SQL/Deps/Perf)',  delegate: 'review',       gate: null },
      { id: 'aggregate',title: 'findings[] aggregieren + Report (md + html)',            delegate: 'review',       gate: 'gate' },
    ],
  },
  ship: {
    description: 'Merge-bereiten PR über das Deploy-Gate bringen (nur Work)',
    steps: [
      { id: 'preflight',title: 'PR-Status: grün, squash-mergeable, Work-Item verlinkt',  delegate: 'general',      gate: null },
      { id: 'review',   title: 'Letzter Review-Gate-Check (keine offenen critical/high)',delegate: 'review',       gate: 'gate' },
      { id: 'merge',    title: 'Squash-Merge',                                           delegate: 'general',      gate: 'confirm' },
      { id: 'pipeline', title: 'Pipeline-Konventionen prüfen (Approval-Stage, Scans)',   delegate: 'general',      gate: 'gate' },
    ],
  },
  plan: {
    description: 'Größeres Vorhaben in einen prüfbaren Schrittplan zerlegen (kein Code)',
    steps: [
      { id: 'clarify',  title: 'Ziel + Erfolgskriterium klären (read-only)',            delegate: 'general',      gate: 'confirm' },
      { id: 'decompose',title: 'In Wellen/Schritte zerlegen, Abhängigkeiten',            delegate: 'general',      gate: null },
      { id: 'record',   title: 'Plan als ADR/Doc festhalten',                           delegate: 'experimental', gate: 'confirm' },
    ],
  },
};

// --- args ---
const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter(a => !a.startsWith('--'));
function opt(name, def = null) {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
}
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
function markerLabel(g) { return g === 'gate' ? ' [GATE]' : g === 'confirm' ? ' [CONFIRM]' : ''; }
function planLines(wf) {
  return wf.steps.map((s, i) => `  ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}`);
}

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
  writeFileSync(file, JSON.stringify(run, null, 2));
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
    return ` ${mark} ${i + 1}. ${s.title} → ${s.delegate}${markerLabel(s.gate)}${s.note ? `  (${s.note})` : ''}`;
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
      : s.gate === 'confirm' ? `[CONFIRM] — vor Ausführung Ja/Nein einholen.\n` : `(kein Gate)\n`),
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
  writeFileSync(file, JSON.stringify(run, null, 2));
  const done = run.steps.filter(s => s.status === 'done').length;
  process.stdout.write(`Schritt ${i + 1} → ${status}. (${done}/${run.steps.length} done)\n`);
  if (status === 'blocked') process.stdout.write(`⚠ blockiert — Workflow hält hier an.\n`);
  process.exit(0);
}

die(2, `usage: run-state.mjs init|show|resume|advance … (workflows: ${Object.keys(WORKFLOWS).join(', ')})`);
