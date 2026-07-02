#!/usr/bin/env node
/**
 * merge-functions.mjs — extend-mode merge of a functions catalog into a Confluence page.
 *
 * Reads the page's Confluence storage format and the catalog produced by extract-ado.mjs.
 * Locates the auto-managed block (delimited by two anchor macros: `ado-functions-begin`
 * and `ado-functions-end`) and merges entries by their stable anchor id (`fn-<adoId>`):
 *   - anchor already in block → PRESERVE the existing entry (extend semantics)
 *   - anchor missing         → APPEND a new entry rendered from the catalog
 *   - anchor in page but NOT in catalog → keep, flag as orphaned in the diff
 * Order: catalog order (Features first, then orphan Stories), orphans appended at end.
 *
 * Usage:
 *   node merge-functions.mjs --catalog catalog.json --page page.xml [--mode extend|regenerate] [--diff diff.md]
 *
 * Output (stdout): full page storage format with the block replaced.
 * Side effect: if --diff PATH is passed, writes a human-readable diff report there.
 * Exit: 0 = ran · 2 = bad input · 3 = markers missing/mismatched.
 */
import { readFileSync, writeFileSync } from 'fs';
const errMsg = e => (e instanceof Error ? e.message : String(e));

// --- args ---
const args = { mode: 'extend' };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--catalog') args.catalog = process.argv[++i];
  else if (a === '--page') args.page = process.argv[++i];
  else if (a === '--mode') args.mode = process.argv[++i];
  else if (a === '--diff') args.diff = process.argv[++i];
}
if (!args.catalog || !args.page) {
  process.stderr.write('usage: merge-functions.mjs --catalog catalog.json --page page.xml [--mode extend|regenerate] [--diff diff.md]\n');
  process.exit(2);
}
if (!['extend', 'regenerate'].includes(args.mode)) {
  process.stderr.write(`merge-functions: unknown --mode "${args.mode}" (extend|regenerate)\n`);
  process.exit(2);
}

let catalog, page;
try { catalog = JSON.parse(readFileSync(args.catalog, 'utf8')); }
catch (e) { process.stderr.write(`merge-functions: cannot read catalog (${errMsg(e)})\n`); process.exit(2); }
try { page = readFileSync(args.page, 'utf8'); }
catch (e) { process.stderr.write(`merge-functions: cannot read page (${errMsg(e)})\n`); process.exit(2); }
if (!catalog || !Array.isArray(catalog.entries)) {
  process.stderr.write('merge-functions: catalog missing "entries" array\n'); process.exit(2);
}

// --- marker locations ---
// Confluence anchor macro is the reliably-preserved way to embed a stable landmark.
// We use two named anchors — ado-functions-begin / -end — as block delimiters.
const anchorRe = name => new RegExp(
  `<ac:structured-macro[^>]*ac:name=["']anchor["'][^>]*>\\s*<ac:parameter[^>]*>${name}</ac:parameter>\\s*</ac:structured-macro>`,
  'i',
);
const beginRe = anchorRe('ado-functions-begin');
const endRe   = anchorRe('ado-functions-end');
const beginM = page.match(beginRe);
const endM   = page.match(endRe);
if (!beginM || !endM || (beginM.index ?? -1) >= (endM.index ?? -1)) {
  process.stderr.write('merge-functions: ado-functions-begin / -end anchor markers not found or out of order.\n');
  process.stderr.write('                 Insert templates/confluence-section.xml into the page first.\n');
  process.exit(3);
}
const blockStart = beginM.index + beginM[0].length;
const blockEnd   = endM.index;
const existingBlock = page.slice(blockStart, blockEnd);

// --- parse existing entries by anchor id ---
// Each entry starts with an anchor macro whose parameter is fn-<id>; the entry runs
// until the next such anchor or end-of-block. This preserves whatever XHTML the user
// hand-crafted inside, including edited descriptions, screenshots, extra prose.
const entryAnchorRe = /<ac:structured-macro[^>]*ac:name=["']anchor["'][^>]*>\s*<ac:parameter[^>]*>(fn-\d+)<\/ac:parameter>\s*<\/ac:structured-macro>/gi;
const matches = [...existingBlock.matchAll(entryAnchorRe)];
const existingEntries = new Map();   // fn-<id> → { xml, anchorId }
for (let i = 0; i < matches.length; i++) {
  const m = matches[i];
  const startsAt = m.index;
  const endsAt = i + 1 < matches.length ? matches[i + 1].index : existingBlock.length;
  existingEntries.set(m[1], { xml: existingBlock.slice(startsAt, endsAt).trim(), anchorId: m[1] });
}

// --- helpers ---
function xhtmlEscape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function renderEntry(e) {
  const desc = (e.description || e.descriptionDraft || '').trim();
  const link = e.url ? `<a href="${xhtmlEscape(e.url)}">ADO #${e.adoId}</a>` : `ADO #${e.adoId}`;
  const stories = (e.sourceStories || []).length
    ? ` <em>(basiert auf ${e.sourceStories.length} Story${e.sourceStories.length === 1 ? '' : 's'})</em>`
    : '';
  return [
    `<p>`,
    `  <ac:structured-macro ac:name="anchor" ac:schema-version="1"><ac:parameter ac:name="">${e.anchor}</ac:parameter></ac:structured-macro>`,
    `  <strong>${xhtmlEscape(e.title)}</strong> — ${xhtmlEscape(desc) || '<em>[Beschreibung fehlt]</em>'} ${link}${stories}`,
    `</p>`,
  ].join('\n');
}

// --- merge ---
const catalogAnchors = new Set(catalog.entries.map(e => e.anchor));
const stats = { added: 0, preserved: 0, regenerated: 0, orphaned: 0 };
const rendered = [];

for (const entry of catalog.entries) {
  if (existingEntries.has(entry.anchor)) {
    if (args.mode === 'regenerate') {
      rendered.push(renderEntry(entry));
      stats.regenerated++;
    } else {
      rendered.push(existingEntries.get(entry.anchor).xml);
      stats.preserved++;
    }
  } else {
    rendered.push(renderEntry(entry));
    stats.added++;
  }
}
// Keep orphaned entries at the end so the user can decide what to do (extend never destroys).
const orphaned = [];
for (const [anchor, entry] of existingEntries) {
  if (!catalogAnchors.has(anchor)) { orphaned.push(entry); stats.orphaned++; }
}
if (orphaned.length) {
  rendered.push('<!-- orphaned: not in ADO catalog anymore; kept for manual review -->');
  for (const o of orphaned) rendered.push(o.xml);
}

const newBlock = '\n' + rendered.join('\n\n') + '\n';
const newPage = page.slice(0, blockStart) + newBlock + page.slice(blockEnd);
process.stdout.write(newPage);

// --- diff report ---
const diffLines = [
  `# product-functions merge (${args.mode})`,
  ``,
  `- Project: ${catalog.project ?? '(unset)'}`,
  `- Catalog entries: ${catalog.entries.length}`,
  `- Existing block entries: ${existingEntries.size}`,
  ``,
  `## Summary`,
  `- ➕ added:       ${stats.added}`,
  `- ✅ preserved:   ${stats.preserved}`,
  `- ♻️ regenerated: ${stats.regenerated}`,
  `- ⚠️ orphaned:    ${stats.orphaned}${stats.orphaned ? ' (kept in page, not in ADO anymore)' : ''}`,
  ``,
];
if (stats.added || stats.orphaned) diffLines.push(`## Detail`);
for (const e of catalog.entries) {
  if (!existingEntries.has(e.anchor)) diffLines.push(`- ➕ **${e.title}** (${e.anchor}) — ${e.type}`);
}
for (const o of orphaned) diffLines.push(`- ⚠️ ${o.anchorId} — orphaned`);

if (args.diff) {
  try { writeFileSync(args.diff, diffLines.join('\n') + '\n'); }
  catch (e) { process.stderr.write(`merge-functions: cannot write diff (${errMsg(e)})\n`); }
}
process.stderr.write(`merge-functions: +${stats.added} =${stats.preserved} ♻${stats.regenerated} ⚠${stats.orphaned}\n`);
