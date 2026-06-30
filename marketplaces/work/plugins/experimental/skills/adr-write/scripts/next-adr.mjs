#!/usr/bin/env node
/**
 * next-adr.mjs — compute the next ADR number and scaffold its content. READ-ONLY.
 * The skill writes the file only after [CONFIRM]; this just removes the manual numbering/templating.
 *
 * Usage:
 *   node next-adr.mjs --title "Use PostgreSQL" [--status Proposed] [--dir docs/adr]
 *
 * Output (stdout): JSON { number, slug, path, content }. Does NOT write any file.
 * Exit: 0 = ok · 2 = bad usage.
 */
import { readdirSync, existsSync } from 'fs';

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; }

const title = arg('title');
if (!title) { process.stderr.write('next-adr: --title "<title>" is required\n'); process.exit(2); }
const status = arg('status', 'Proposed');
const dir = arg('dir', 'docs/adr');

const nums = existsSync(dir)
  ? readdirSync(dir).map(f => (f.match(/^(\d{4})-/) || [])[1]).filter(Boolean).map(Number)
  : [];
const number = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');

const slug = title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
const path = `${dir}/${number}-${slug}.md`;
const date = new Date().toISOString().slice(0, 10);

const content = `# ADR ${number}: ${title}

**Status:** ${status}
**Datum:** ${date}

## Kontext
[Problem-Beschreibung]

## Entscheidung
[Was wird entschieden]

## Begründung
[Warum diese Entscheidung]

## Konsequenzen
[Was ändert sich, was bleibt offen]
`;

process.stdout.write(JSON.stringify({ number, slug, path, content }, null, 2) + '\n');
process.stderr.write(`next-adr: next is ADR ${number} → ${path} (not written — confirm first).\n`);
