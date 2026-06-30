#!/usr/bin/env node
/**
 * gitleaks-to-findings.mjs — convert a gitleaks JSON report into findings[] (redacted).
 * The detection stays with gitleaks; this maps its output deterministically and NEVER emits secrets.
 *
 * Usage:
 *   gitleaks detect --no-banner --report-format json --report-path leaks.json
 *   node gitleaks-to-findings.mjs leaks.json        # or: cat leaks.json | node gitleaks-to-findings.mjs
 *
 * Output (stdout): findings[] (docs/findings-schema.md, area:security, SECR-*), values REDACTED.
 * Exit: 0 = ran · 2 = unreadable input.
 */
import { readFileSync } from 'fs';
const errMsg = e => (e instanceof Error ? e.message : String(e));

function read(file) {
  try { const d = JSON.parse(file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8'));
    if (!Array.isArray(d)) throw new Error('gitleaks report must be a JSON array'); return d; }
  catch (e) { process.stderr.write(`gitleaks-to-findings: cannot read report (${errMsg(e)})\n`); process.exit(2); }
}

// Map gitleaks RuleID → our SECR-* category.
function ruleFor(id = '') {
  const r = id.toLowerCase();
  if (/aws|azure|gcp|cloud/.test(r)) return 'SECR-CLOUD';
  if (/private[-_]?key|rsa|pem/.test(r)) return 'SECR-PRIVKEY';
  if (/token|pat|oauth|github|slack|bearer/.test(r)) return 'SECR-TOKEN';
  if (/conn|database|password|pwd/.test(r)) return 'SECR-DBCONN';
  return 'SECR-SECRET';
}

const leaks = read(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null);
const findings = leaks.map(l => ({
  severity: 'critical',
  area: 'security',
  ruleId: ruleFor(l.RuleID),
  file: l.File ?? 'unknown',
  line: Number(l.StartLine) || 0,
  // REDACTED: never include l.Secret / l.Match.
  message: `${l.RuleID ?? 'secret'}: ${l.Description ?? 'hardcoded secret'} [REDACTED]${l.Commit ? ` (commit ${String(l.Commit).slice(0, 8)})` : ''}`,
  suggestion: 'Rotate the secret now, then purge it from git history (removal alone is insufficient — history retains it).',
}));

// dedupe identical file+line+rule (same secret found across commits)
const seen = new Set();
const unique = findings.filter(f => { const k = `${f.ruleId}|${f.file}|${f.line}`; if (seen.has(k)) return false; seen.add(k); return true; });

process.stdout.write(JSON.stringify(unique, null, 2) + '\n');
process.stderr.write(`gitleaks-to-findings: ${unique.length} secret finding(s) [redacted].\n`);
