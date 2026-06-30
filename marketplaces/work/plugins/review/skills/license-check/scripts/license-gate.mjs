#!/usr/bin/env node
/**
 * license-gate.mjs — classify package licenses against an SPDX policy → findings[].
 * Deterministic policy check; run it on the license list from nuget-license / license-checker.
 *
 * Usage:
 *   node license-gate.mjs <licenses.json>      # or stdin
 * Input: JSON array of { name, version?, license }  (license = SPDX id or "UNKNOWN"/null).
 * Output (stdout): findings[] (area:licenses, LIC-*) for problematic licenses only (permissive = OK).
 * Exit: 0 = ran · 2 = unreadable input.
 */
import { readFileSync } from 'fs';
const errMsg = e => (e instanceof Error ? e.message : String(e));

const STRONG = [/^GPL-/i, /^AGPL-/i, /^SSPL/i];            // copyleft → deny (critical)
const WEAK   = [/^LGPL-/i, /^MPL-/i, /^EPL-/i, /^CDDL/i];  // weak copyleft → review (high)
const PERMISSIVE = [/^MIT$/i, /^Apache-2\.0$/i, /^BSD-/i, /^ISC$/i, /^0BSD$/i, /^Unlicense$/i, /^CC0-/i];

function classify(license) {
  const l = (license ?? '').trim();
  if (!l || /^unknown$/i.test(l) || l === 'NOASSERTION') return { ruleId: 'LIC-UNKNOWN', severity: 'high' };
  if (STRONG.some(r => r.test(l)))      return { ruleId: 'LIC-DENY', severity: 'critical' };
  if (WEAK.some(r => r.test(l)))        return { ruleId: 'LIC-WEAK', severity: 'high' };
  if (PERMISSIVE.some(r => r.test(l)))  return null;                 // OK — no finding
  return { ruleId: 'LIC-CUSTOM', severity: 'medium' };              // non-OSI/custom → manual approval
}

function read(file) {
  try { const d = JSON.parse(file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8'));
    if (!Array.isArray(d)) throw new Error('expected a JSON array of { name, license }'); return d; }
  catch (e) { process.stderr.write(`license-gate: cannot read input (${errMsg(e)})\n`); process.exit(2); }
}

const pkgs = read(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null);
const findings = [];
let okCount = 0;
for (const p of pkgs) {
  const c = classify(p.license);
  if (!c) { okCount++; continue; }
  findings.push({
    severity: c.severity, area: 'licenses', ruleId: c.ruleId,
    file: p.name + (p.version ? `@${p.version}` : ''),
    message: `${p.name}: license "${p.license ?? 'UNKNOWN'}" — ${
      c.ruleId === 'LIC-DENY' ? 'strong copyleft, conflicts with proprietary/distributed code'
      : c.ruleId === 'LIC-WEAK' ? 'weak copyleft, check linking terms'
      : c.ruleId === 'LIC-UNKNOWN' ? 'no/unclear license, not cleared for use'
      : 'non-OSI/custom license, needs manual approval'}`,
    suggestion: c.ruleId === 'LIC-DENY' ? 'Replace the dependency or obtain a commercial/exception license.'
      : c.ruleId === 'LIC-UNKNOWN' ? 'Determine the license; do not ship until cleared.'
      : 'Legal review before shipping.',
  });
}
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.file.localeCompare(b.file));
process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
process.stderr.write(`license-gate: ${findings.length} problematic, ${okCount} permissive/OK of ${pkgs.length}.\n`);
