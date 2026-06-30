#!/usr/bin/env node
/**
 * audit-to-findings.mjs — convert a vulnerability audit (dotnet or npm) into findings[].
 * Deterministic mapping; run it on the audit output instead of transcribing by hand.
 *
 * Usage:
 *   dotnet list package --vulnerable --include-transitive --format json > audit.json
 *   node audit-to-findings.mjs audit.json            # auto-detects dotnet vs npm
 *   npm audit --json | node audit-to-findings.mjs
 *
 * Output (stdout): findings[] (docs/findings-schema.md, area:deps, ruleId DEP-CRIT|HIGH|MED|LOW).
 * Exit: 0 = ran (gate handled by caller) · 2 = unreadable input.
 */
import { readFileSync } from 'fs';

const SEV = { critical: 'critical', high: 'high', moderate: 'medium', medium: 'medium', low: 'low' };
const RULE = { critical: 'DEP-CRIT', high: 'DEP-HIGH', medium: 'DEP-MED', low: 'DEP-LOW' };
const errMsg = e => (e instanceof Error ? e.message : String(e));

function read(file) {
  try { return JSON.parse(file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8')); }
  catch (e) { process.stderr.write(`audit-to-findings: cannot read input (${errMsg(e)})\n`); process.exit(2); }
}

function fromDotnet(doc) {
  const out = [];
  for (const proj of doc.projects ?? []) {
    for (const fw of proj.frameworks ?? []) {
      for (const kind of ['topLevelPackages', 'transitivePackages']) {
        for (const pkg of fw[kind] ?? []) {
          for (const v of pkg.vulnerabilities ?? []) {
            const sev = SEV[String(v.severity).toLowerCase()] ?? 'medium';
            out.push({
              severity: sev, area: 'deps', ruleId: RULE[sev],
              file: proj.path ?? 'project',
              message: `${pkg.id}@${pkg.resolvedVersion} (${kind === 'transitivePackages' ? 'transitive' : 'direct'}): ${v.advisoryurl ?? 'vulnerability'}`,
              suggestion: kind === 'transitivePackages'
                ? 'Bump/override the nearest direct package to a fixed version.'
                : 'Upgrade to the smallest fixed version; check for breaking changes.',
            });
          }
        }
      }
    }
  }
  return out;
}

function fromNpm(doc) {
  const out = [];
  for (const [name, v] of Object.entries(doc.vulnerabilities ?? {})) {
    const sev = SEV[String(v.severity).toLowerCase()] ?? 'medium';
    const via = (v.via ?? []).map(x => (typeof x === 'string' ? x : x.title)).filter(Boolean)[0];
    out.push({
      severity: sev, area: 'deps', ruleId: RULE[sev],
      file: 'package.json',
      message: `${name} (${v.range ?? '?'}): ${via ?? 'vulnerability'}`,
      suggestion: v.fixAvailable ? 'Run npm audit fix (or bump to the fixed version).' : 'No fix available — document a mitigation.',
    });
  }
  return out;
}

const doc = read(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null);
const findings = doc.projects ? fromDotnet(doc) : doc.vulnerabilities ? fromNpm(doc) : null;
if (findings === null) { process.stderr.write('audit-to-findings: unrecognized format (expected dotnet --format json or npm audit --json)\n'); process.exit(2); }

// deterministic order: severity then message
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.message.localeCompare(b.message));
process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
process.stderr.write(`audit-to-findings: ${findings.length} finding(s).\n`);
