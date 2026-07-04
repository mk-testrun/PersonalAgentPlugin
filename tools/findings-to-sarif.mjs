#!/usr/bin/env node
/**
 * findings-to-sarif.mjs — konvertiert findings[] (docs/findings-schema.md) nach SARIF 2.1.0.
 * Damit landen Review-Ergebnisse in jedem SARIF-Konsumenten (GitHub Code Scanning,
 * Azure DevOps, VS Code SARIF Viewer) statt nur in Markdown/HTML-Reports.
 *
 * Usage:
 *   node tools/findings-to-sarif.mjs <findings.json> [--out report.sarif] [--tool-name <name>]
 *   cat findings.json | node tools/findings-to-sarif.mjs
 *
 * Mapping: severity critical/high → error · medium → warning · low/info → note
 * (Original-Severity bleibt als properties.severity erhalten). Exit: 0 ok · 2 unlesbarer Input.
 */
import { readFileSync, writeFileSync } from 'fs';

const argv = process.argv.slice(2);
const positional = argv.filter(a => !a.startsWith('--'));
function opt(name, def = null) {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
}

let findings;
try {
  const raw = positional[0] ? readFileSync(positional[0], 'utf8') : readFileSync(0, 'utf8');
  findings = JSON.parse(raw);
  if (!Array.isArray(findings)) throw new Error('findings must be a JSON array');
} catch (e) {
  process.stderr.write(`findings-to-sarif: cannot read input (${e instanceof Error ? e.message : String(e)})\n`);
  process.exit(2);
}

const LEVEL = { critical: 'error', high: 'error', medium: 'warning', low: 'note', info: 'note' };

// rules: eine Rule je ruleId (SARIF verlangt eindeutige Rule-Metadaten)
const ruleIndex = new Map();
for (const f of findings) {
  const id = String(f.ruleId ?? 'UNKNOWN');
  if (!ruleIndex.has(id)) {
    ruleIndex.set(id, {
      id,
      shortDescription: { text: id },
      properties: { area: f.area ?? 'unknown' },
    });
  }
}

const results = findings.map(f => {
  const r = {
    ruleId: String(f.ruleId ?? 'UNKNOWN'),
    ruleIndex: [...ruleIndex.keys()].indexOf(String(f.ruleId ?? 'UNKNOWN')),
    level: LEVEL[f.severity] ?? 'note',
    message: { text: String(f.message ?? '') },
    properties: { severity: f.severity, area: f.area, ...(f.suggestion ? { suggestion: f.suggestion } : {}) },
  };
  if (f.file) {
    r.locations = [{
      physicalLocation: {
        artifactLocation: { uri: String(f.file).replace(/\\/g, '/') },
        ...(Number.isInteger(f.line) && f.line > 0 ? { region: { startLine: f.line } } : {}),
      },
    }];
  }
  return r;
});

const sarif = {
  $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [{
    tool: {
      driver: {
        name: opt('tool-name', 'review-aggregate'),
        informationUri: 'https://github.com/mk-testrun/PersonalAgentPlugin',
        rules: [...ruleIndex.values()],
      },
    },
    results,
  }],
};

const out = opt('out');
const json = JSON.stringify(sarif, null, 2);
if (out) { writeFileSync(out, json); process.stderr.write(`findings-to-sarif: ${results.length} result(s) → ${out}\n`); }
else process.stdout.write(json + '\n');
