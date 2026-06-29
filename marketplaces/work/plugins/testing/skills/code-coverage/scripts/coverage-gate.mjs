#!/usr/bin/env node
/**
 * coverage-gate.mjs — parse a Cobertura coverage report and decide the coverage gate.
 * Deterministic: same report → same verdict. Use instead of eyeballing the numbers.
 *
 * Usage:
 *   node coverage-gate.mjs <cobertura.xml> [--overall 70] [--domain 80] [--domain-pattern Domain]
 *
 * Gates (defaults, from references/gates.md):
 *   - overall branch coverage >= 70%
 *   - domain-layer branch coverage >= 80% (packages whose name matches --domain-pattern)
 *
 * Output (stdout): JSON { pass, overall, domain, thresholds, packages }.
 * Exit: 0 = gate passed · 1 = gate failed · 2 = unreadable report.
 */
import { readFileSync } from 'fs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}
function errMsg(e) { return e instanceof Error ? e.message : String(e); }

const file = process.argv[2];
const overallMin = Number(arg('overall', 70));
const domainMin = Number(arg('domain', 80));
const domainPattern = new RegExp(arg('domain-pattern', 'Domain'), 'i');

let xml;
try {
  if (!file || file.startsWith('--')) throw new Error('no report path given');
  xml = readFileSync(file, 'utf8');
} catch (e) {
  process.stderr.write(`coverage-gate: cannot read report (${errMsg(e)})\n`);
  process.exit(2);
}

const pct = rate => Math.round(Number(rate) * 1000) / 10; // 0.731 -> 73.1

const rootMatch = xml.match(/<coverage\b[^>]*\bbranch-rate="([0-9.]+)"/);
if (!rootMatch) { process.stderr.write('coverage-gate: no root branch-rate found (not a Cobertura report?)\n'); process.exit(2); }
const overall = pct(rootMatch[1]);

const packages = [...xml.matchAll(/<package\b[^>]*\bname="([^"]*)"[^>]*\bbranch-rate="([0-9.]+)"/g)]
  .map(m => ({ name: m[1], branch: pct(m[2]) }));
const domainPkgs = packages.filter(p => domainPattern.test(p.name));
const domain = domainPkgs.length ? Math.min(...domainPkgs.map(p => p.branch)) : null;

const overallPass = overall >= overallMin;
const domainPass = domain === null ? true : domain >= domainMin;
const pass = overallPass && domainPass;

const result = {
  pass,
  overall: { value: overall, min: overallMin, pass: overallPass },
  domain: domain === null
    ? { value: null, min: domainMin, pass: true, note: `no package matched /${domainPattern.source}/i` }
    : { value: domain, min: domainMin, pass: domainPass, packages: domainPkgs },
  packages,
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.stderr.write(`coverage-gate: overall ${overall}% (min ${overallMin}) · domain ${domain ?? 'n/a'}% (min ${domainMin}) → ${pass ? 'PASS' : 'GATE BLOCKED'}\n`);
process.exit(pass ? 0 : 1);
