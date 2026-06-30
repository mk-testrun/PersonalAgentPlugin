#!/usr/bin/env node
/**
 * aggregate.mjs — deterministic dedupe/sort/gate for review findings.
 * Low-freedom utility: run this instead of doing the merge by hand.
 *
 * Usage:
 *   node aggregate.mjs <findings.json> [--top N]
 *   cat findings.json | node aggregate.mjs --top 10
 *
 * Input:  a JSON array of findings (docs/findings-schema.md).
 * Output (stdout): JSON { gate, counts, byArea, top, findings } — deterministic for a given input.
 * Exit:   0 always on valid input; 2 on bad input (with a clear message on stderr).
 */
import { readFileSync } from 'fs';

const SEVERITY = ['critical', 'high', 'medium', 'low', 'info'];
const rank = s => { const i = SEVERITY.indexOf(s); return i === -1 ? SEVERITY.length : i; };

function parseArgs(argv) {
  const args = { file: null, top: 10 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--top') { args.top = Number(argv[++i]) || 10; }
    else if (!args.file) { args.file = argv[i]; }
  }
  return args;
}

function readInput(file) {
  try {
    const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('findings must be a JSON array');
    return data;
  } catch (e) {
    process.stderr.write(`aggregate: cannot read findings (${e.message})\n`);
    process.exit(2);
  }
}

/** Dedupe by ruleId|file|line, keeping highest severity and merging sources + suggestions. */
function dedupe(findings) {
  const byKey = new Map();
  for (const f of findings) {
    const key = `${f.ruleId ?? ''}|${f.file ?? ''}|${f.line ?? ''}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...f, sources: f.sources ?? (f.source ? [f.source] : []) });
      continue;
    }
    if (rank(f.severity) < rank(prev.severity)) prev.severity = f.severity;
    const src = f.source ? [f.source] : (f.sources ?? []);
    prev.sources = [...new Set([...(prev.sources ?? []), ...src])];
    if (f.suggestion && f.suggestion !== prev.suggestion)
      prev.suggestion = [prev.suggestion, f.suggestion].filter(Boolean).join(' | ');
  }
  return [...byKey.values()];
}

function sortFindings(findings) {
  return findings.sort((a, b) =>
    rank(a.severity) - rank(b.severity) ||
    String(a.area).localeCompare(String(b.area)) ||
    String(a.file).localeCompare(String(b.file)) ||
    (Number(a.line) || 0) - (Number(b.line) || 0));
}

function main() {
  const { file, top } = parseArgs(process.argv.slice(2));
  const deduped = sortFindings(dedupe(readInput(file)));
  const counts = Object.fromEntries(SEVERITY.map(s => [s, 0]));
  const byArea = {};
  for (const f of deduped) {
    if (counts[f.severity] !== undefined) counts[f.severity]++;
    byArea[f.area] = (byArea[f.area] ?? 0) + 1;
  }
  const gate = counts.critical > 0 || counts.high > 0;
  const result = { gate, counts, byArea, top: deduped.slice(0, top), findings: deduped };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.stderr.write(`aggregate: ${deduped.length} unique finding(s), gate=${gate ? 'BLOCKED' : 'PASS'}\n`);
}

main();
