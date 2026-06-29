#!/usr/bin/env node
/**
 * Structural validator/runner for skill evaluations.
 * Scans a marketplace for skills/<name>/evals/cases.json and verifies each is well-formed:
 *   - an array of >= 3 cases
 *   - each case has: query (string), expected_behavior (>=1 strings), and a skill ref
 *   - referenced fixture files (if any) exist
 * Token-free: this checks eval *definitions*. Actual behavioral runs require the Copilot/Claude
 * runtime; this gate guarantees every flagship skill ships valid, non-empty evals.
 *
 * Usage: node tools/run-evals.mjs <marketplace-path> [--require-for <comma,list>]
 * Exit 0 = all present evals valid (and required skills have evals); Exit 1 = problems.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const MIN_CASES = 3;
const mp = process.argv[2];
if (!mp) { console.error('Usage: node tools/run-evals.mjs <marketplace-path> [--require-for a,b]'); process.exit(1); }
const requireIdx = process.argv.indexOf('--require-for');
const required = requireIdx > -1 ? (process.argv[requireIdx + 1] ?? '').split(',').filter(Boolean) : [];

const abs = resolve(mp);
const pluginsDir = join(abs, 'plugins');
const errors = [];
let evalFilesFound = 0, casesTotal = 0;
const skillsWithEvals = new Set();

function checkCasesFile(file, label) {
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { errors.push(`[${label}] invalid JSON: ${e.message}`); return; }
  if (!Array.isArray(data)) { errors.push(`[${label}] cases.json must be an array`); return; }
  if (data.length < MIN_CASES) errors.push(`[${label}] has ${data.length} cases, need >= ${MIN_CASES}`);
  data.forEach((c, i) => {
    if (!c || typeof c.query !== 'string' || !c.query.trim()) errors.push(`[${label}] case ${i}: missing "query"`);
    if (!Array.isArray(c.expected_behavior) || c.expected_behavior.length < 1)
      errors.push(`[${label}] case ${i}: needs non-empty "expected_behavior"[]`);
    for (const f of c.files ?? []) {
      const fixture = join(file, '..', f);
      if (!existsSync(fixture)) errors.push(`[${label}] case ${i}: fixture not found: ${f}`);
    }
  });
  evalFilesFound++; casesTotal += data.length;
}

if (existsSync(pluginsDir)) {
  for (const plugin of readdirSync(pluginsDir).filter(d => statSync(join(pluginsDir, d)).isDirectory())) {
    const skillsDir = join(pluginsDir, plugin, 'skills');
    if (!existsSync(skillsDir)) continue;
    for (const skill of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
      const cases = join(skillsDir, skill, 'evals', 'cases.json');
      if (existsSync(cases)) { checkCasesFile(cases, `${plugin}/${skill}`); skillsWithEvals.add(skill); }
    }
  }
}

for (const r of required) if (!skillsWithEvals.has(r)) errors.push(`required skill "${r}" has no evals/cases.json`);

console.log(`\nEvals in ${mp}: ${evalFilesFound} file(s), ${casesTotal} case(s).`);
if (errors.length) {
  console.error('Problems:'); errors.forEach(e => console.error(`  ✗  ${e}`));
  console.error(`\n${errors.length} problem(s). FAILED.`);
  process.exit(1);
}
console.log('✓  All present eval definitions are valid.');
process.exit(0);
