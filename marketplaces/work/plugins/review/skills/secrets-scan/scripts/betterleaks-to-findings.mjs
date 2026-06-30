#!/usr/bin/env node
/**
 * betterleaks-to-findings.mjs — convert betterleaks JSON report(s) into findings[] (redacted).
 * Detection stays with betterleaks (native, expressions-based config); this maps its output
 * deterministically and NEVER emits secrets.
 *
 * Usage:
 *   betterleaks dir . --config .betterleaks.toml --redact --report-format json --report-path leaks.json
 *   betterleaks git . --config .betterleaks.toml --redact --report-format json --report-path history.json
 *   node betterleaks-to-findings.mjs leaks.json history.json   # or: cat leaks.json | node betterleaks-to-findings.mjs
 *
 * Output (stdout): findings[] (docs/findings-schema.md, area:security, SECR-*), values REDACTED.
 * Exit: 0 = ran · 2 = unreadable input.
 */
import { readFileSync } from 'fs';
const errMsg = e => (e instanceof Error ? e.message : String(e));

function readReport(file) {
  try {
    const d = JSON.parse(file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8'));
    if (!Array.isArray(d)) throw new Error('betterleaks report must be a JSON array');
    return d;
  } catch (e) {
    process.stderr.write(`betterleaks-to-findings: cannot read report (${errMsg(e)})\n`);
    process.exit(2);
  }
}

// Map a betterleaks RuleID → our SECR-* category.
function ruleFor(id = '') {
  const r = id.toLowerCase();
  if (/aws|azure|gcp|cloud/.test(r)) return 'SECR-CLOUD';
  if (/private[-_]?key|rsa|pem/.test(r)) return 'SECR-PRIVKEY';
  if (/token|pat|oauth|github|slack|bearer/.test(r)) return 'SECR-TOKEN';
  if (/conn|database|password|pwd/.test(r)) return 'SECR-DBCONN';
  return 'SECR-SECRET';
}

// betterleaks' new expressions can validate a secret live (validate.active/inactive/unknown).
// Surface only the STATUS — never the value.
function liveTag(l) {
  const v = String(l.Validation ?? l.ValidationStatus ?? l.Status ?? '').toLowerCase();
  if (/active|valid|confirmed|live/.test(v)) return ' [LIVE — validated active]';
  if (/inactive|invalid|revoked/.test(v)) return ' [validated inactive]';
  return '';
}

const files = process.argv.slice(2).filter(a => !a.startsWith('-'));
const leaks = files.length ? files.flatMap(readReport) : readReport(null);

const findings = leaks.map(l => ({
  severity: 'critical',
  area: 'security',
  ruleId: ruleFor(l.RuleID),
  file: l.File ?? 'unknown',
  line: Number(l.StartLine) || 0,
  // REDACTED: never include l.Secret / l.Match.
  message: `${l.RuleID ?? 'secret'}: ${l.Description ?? 'hardcoded secret'} [REDACTED]${liveTag(l)}${l.Commit ? ` (commit ${String(l.Commit).slice(0, 8)})` : ''}`,
  suggestion: 'Rotate the secret now, then purge it from git history (removal alone is insufficient — history retains it).',
}));

// dedupe identical file+line+rule (same secret found across commits / both reports)
const seen = new Set();
const unique = findings.filter(f => { const k = `${f.ruleId}|${f.file}|${f.line}`; if (seen.has(k)) return false; seen.add(k); return true; });

process.stdout.write(JSON.stringify(unique, null, 2) + '\n');
process.stderr.write(`betterleaks-to-findings: ${unique.length} secret finding(s) [redacted].\n`);
