#!/usr/bin/env node
/**
 * extract-ado.mjs — normalize an ADO work-item dump into a stable functions catalog.
 * The ADO fetch itself is done by the model via the `ado/*` MCP; this script does the
 * deterministic normalization/slugging/grouping so re-runs produce identical structure.
 *
 * Input shape (stdin or file arg) — model-normalized ADO extract:
 *   {
 *     "project": "MyProject",
 *     "workItems": [
 *       { "id": 1234, "type": "Feature"|"User Story",
 *         "title": "…", "description": "…", "acceptanceCriteria": "…",
 *         "state": "Active"|"Resolved"|"Closed"|"…",
 *         "parentId": null|<number>, "url": "https://…/1234" }
 *     ]
 *   }
 *
 * Output (stdout): catalog JSON — one entry per PRODUCT FUNCTION.
 *   Scope: Features + orphan User Stories (no Feature parent). Child stories of a
 *   Feature are attached as sourceStories[] so its description can be enriched later.
 *
 * Exit: 0 = ran · 2 = unreadable/invalid input.
 */
import { readFileSync } from 'fs';
const errMsg = e => (e instanceof Error ? e.message : String(e));

function readInput(file) {
  try {
    const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.workItems)) throw new Error('input must be { project, workItems: [...] }');
    return d;
  } catch (e) {
    process.stderr.write(`extract-ado: cannot read input (${errMsg(e)})\n`);
    process.exit(2);
  }
}

// slug: lowercase, strip diacritics, non-alnum → hyphen, collapse, trim to 60.
function slugify(s = '') {
  return String(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unnamed';
}

// Rule-based description draft: first sentence of description, else first line of
// acceptance criteria, else empty. The model is expected to REPLACE this with prose;
// storing a draft makes the extract phase self-contained and testable.
function draftDescription(wi) {
  const src = String(wi.description || wi.acceptanceCriteria || '').trim();
  if (!src) return '';
  // strip HTML tags that ADO returns
  const text = src.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return firstSentence.length > 240 ? firstSentence.slice(0, 237) + '…' : firstSentence;
}

const input = readInput(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null);
const byId = new Map(input.workItems.map(wi => [Number(wi.id), wi]));

// Group children under their parent Feature.
const childrenOf = new Map();
for (const wi of input.workItems) {
  if (wi.type === 'User Story' && wi.parentId && byId.get(Number(wi.parentId))?.type === 'Feature') {
    const arr = childrenOf.get(Number(wi.parentId)) || [];
    arr.push(wi);
    childrenOf.set(Number(wi.parentId), arr);
  }
}

// Scope: Features + orphan User Stories (no Feature parent).
const entries = [];
const seen = new Set();
for (const wi of input.workItems) {
  const id = Number(wi.id);
  if (seen.has(id)) continue;
  const isFeature = wi.type === 'Feature';
  const parent = wi.parentId ? byId.get(Number(wi.parentId)) : null;
  const isOrphanStory = wi.type === 'User Story' && (!parent || parent.type !== 'Feature');
  if (!isFeature && !isOrphanStory) continue;

  const kids = isFeature ? (childrenOf.get(id) || []) : [];
  entries.push({
    adoId: id,
    type: wi.type,
    anchor: `fn-${id}`,                                   // stable Confluence anchor
    slug: slugify(wi.title),
    title: String(wi.title || '').trim() || `Work item ${id}`,
    state: wi.state || 'Unknown',
    url: wi.url || null,
    // model REPLACES this with a 1-sentence, user-facing description
    descriptionDraft: draftDescription(wi),
    sourceStories: kids
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(k => ({ adoId: Number(k.id), title: String(k.title || '').trim(), url: k.url || null, state: k.state || null })),
  });
  seen.add(id);
}

// Stable order: Features first (by id), then orphan stories (by id).
entries.sort((a, b) => {
  if (a.type !== b.type) return a.type === 'Feature' ? -1 : 1;
  return a.adoId - b.adoId;
});

const catalog = { project: input.project || null, generatedAt: null, entries };
process.stdout.write(JSON.stringify(catalog, null, 2) + '\n');
process.stderr.write(`extract-ado: ${entries.length} function(s) (${entries.filter(e => e.type === 'Feature').length} Feature, ${entries.filter(e => e.type === 'User Story').length} orphan Story).\n`);
