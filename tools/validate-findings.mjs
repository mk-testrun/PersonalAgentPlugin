#!/usr/bin/env node
/**
 * validate-findings.mjs — validate a findings[] payload against docs/findings-schema.md.
 * Shared self-check for all review skills: produce findings[] → validate → fix → repeat.
 *
 * Usage:
 *   node tools/validate-findings.mjs <findings.json>
 *   cat findings.json | node tools/validate-findings.mjs
 *
 * Exit: 0 = valid · 1 = schema problems (listed) · 2 = unreadable input.
 * Additive: this does not replace any skill content — it verifies the output the skill emits.
 */
import { readFileSync } from 'fs';

const SEVERITY = ['critical', 'high', 'medium', 'low', 'info'];
const AREA = ['accessibility', 'security', 'performance', 'design', 'sql', 'deps',
  'licenses', 'pipeline', 'env', 'tests', 'coverage', 'wcag'];

function readInput(file) {
  try {
    const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('findings must be a JSON array');
    return data;
  } catch (e) {
    process.stderr.write(`validate-findings: cannot read input (${e instanceof Error ? e.message : String(e)})\n`);
    process.exit(2);
  }
}

function validate(findings) {
  const problems = [];
  findings.forEach((f, i) => {
    const at = `finding[${i}]`;
    if (f === null || typeof f !== 'object') { problems.push(`${at}: not an object`); return; }
    if (!SEVERITY.includes(f.severity))
      problems.push(`${at}: severity "${f.severity}" not in ${SEVERITY.join('|')}`);
    if (!AREA.includes(f.area))
      problems.push(`${at}: area "${f.area}" not in ${AREA.join('|')}`);
    if (typeof f.ruleId !== 'string' || !f.ruleId.trim())
      problems.push(`${at}: ruleId must be a non-empty string`);
    if (typeof f.message !== 'string' || !f.message.trim())
      problems.push(`${at}: message must be a non-empty string`);
    if (f.line !== undefined && (typeof f.line !== 'number' || !Number.isInteger(f.line)))
      problems.push(`${at}: line must be an integer when present`);
    if (f.file !== undefined && typeof f.file !== 'string')
      problems.push(`${at}: file must be a string when present`);
    if (f.suggestion !== undefined && typeof f.suggestion !== 'string')
      problems.push(`${at}: suggestion must be a string when present`);
  });
  return problems;
}

const file = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const findings = readInput(file);
const problems = validate(findings);
if (problems.length) {
  process.stderr.write(`validate-findings: ${problems.length} problem(s) in ${findings.length} finding(s):\n`);
  problems.forEach(p => process.stderr.write(`  ✗  ${p}\n`));
  process.exit(1);
}
process.stdout.write(`validate-findings: OK — ${findings.length} finding(s) valid.\n`);
process.exit(0);
