/**
 * maturity.mjs — misst den Reifegrad eines Skill-Pakets (0–5 ★) über 6 gewichtete Achsen.
 *
 * Bewusst FLACH: ein reiner Wissens-Skill (z. B. *-conventions) ohne Skript kann max. ~4★ erreichen —
 * 5★ ist Paketen mit lauffähiger Determinismus (scripts + evals) vorbehalten. Absichtlich niedrige
 * Scores werden NICHT hier annotiert, sondern im manuell gepflegten uplift-tracker.md als Anti-Ziel.
 *
 * Der Score ist reines Reporting: kein Error/Warning, kein Exit-Code-Impact.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TOOL_KEYWORDS = /\b(mcp|playwright|confluence|ado|betterleaks|sharplens|kingfisher|roslyn|ef[- ]?core|dotnet|sql|findings|artifact|supertonic|chart|mermaid|excalidraw|git|node|owasp|wcag)\b/i;

// Achsen-Gewichte (Summe 100). Kern-Qualität schwerer als „Advanced".
// Weights (sum 100). A "solid" self-contained skill (sharp description + substantive, well-structured
// body) reaches ~2★ WITHOUT external files (ADR-0006: not every skill needs reference/scripts). 3★+ adds
// reference/examples/evals/scripts. Resolves ADR-0008's open weight question (2026-07).
export const AXES = {
  description: 22,   // Länge + Trigger-Phrase + konkrete Tool/MCP-Nennung (Discovery-Schicht)
  body:        20,   // substantieller, gegliederter SKILL.md-Body + Ressourcen-Links (self-contained)
  reference:   13,   // reference.md ODER references/-Ordner + Tiefe
  examples:    12,   // examples.md + Code-Block
  evals:       18,   // cases.json + >=3 + Fixture
  scripts:     15,   // scripts/*.mjs + Shebang + node --check clean
};

const STAR_THRESHOLDS = [ [90, 5], [75, 4], [55, 3], [35, 2], [15, 1], [0, 0] ];
export const starsFor = pct => STAR_THRESHOLDS.find(([t]) => pct >= t)[1];

function read(file) { try { return readFileSync(file, 'utf8'); } catch { return ''; } }
// line-based frontmatter reader — handles inline, quoted, and block scalars (>-, |).
function frontmatterValue(md, key) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return '';
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z_][\w-]*):\s?(.*)$/);
    if (!kv || kv[1] !== key) continue;
    let val = kv[2];
    if (val === '' || /^[>|][-+]?$/.test(val)) {
      const collected = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '' || /^\s+\S/.test(lines[j])) collected.push(lines[j].trim());
        else break;
      }
      val = collected.join(' ');
    } else {
      val = val.trim().replace(/^['"]|['"]$/g, '');
    }
    return val.replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** Score one skill directory. Returns { stars, pct, axes:{name:{got,max}}, missing:[] }. */
export function scoreSkill(skillDir) {
  const skillMd = join(skillDir, 'SKILL.md');
  const md = read(skillMd);
  const got = {}; const missing = [];
  const has = p => existsSync(join(skillDir, p));

  // --- description (22) ---
  const desc = frontmatterValue(md, 'description');
  let d = 0;
  if (desc.length >= 200 && desc.length <= 1024) d += 10; else if (desc.length >= 120) d += 5;
  // trigger phrase: EN "use when/after/to/for", "when asked" · DE "nutze wenn/um/beim/für/proaktiv"
  if (/\b(use (when|after|to|for)|when asked|nutze (wenn|um|beim|proaktiv|für))\b/i.test(desc)) d += 6;
  else missing.push('description: Trigger-Phrase ("Use when …" / "Nutze wenn …")');
  if (TOOL_KEYWORDS.test(desc)) d += 6;
  if (d < 14) missing.push('description: zu dünn (Länge/Trigger/Tool-Nennung)');
  got.description = { got: d, max: AXES.description };

  // --- body (20) — substantieller, gegliederter SKILL.md-Body + Ressourcen-Links (self-contained) ---
  let b = 0;
  const bodyText = md.replace(/^---[\s\S]*?---/, '').trim();
  const headings = (bodyText.match(/^##\s/gm) || []).length;
  if (headings >= 3) b += 6; else if (headings >= 2) b += 3;
  if (bodyText.length > 1000) b += 6; else if (bodyText.length > 500) b += 3;
  else missing.push('SKILL.md-Body zu dünn');
  if (/##\s*.*(when to use|wann|scope)/i.test(md) && /##\s*.*(output|workflow|schritte|steps|regeln|aktionen)/i.test(md)) b += 4;
  const links = ['reference.md', 'references/', 'examples.md', 'templates'].filter(t => md.includes(t)).length;
  b += Math.min(4, links * 2);
  got.body = { got: b, max: AXES.body };

  // --- reference (13) — reference.md (singular) OR a references/ folder with >=1 .md ---
  let r = 0;
  const refMd = read(join(skillDir, 'reference.md'));
  const refDir = join(skillDir, 'references');
  const refDirMds = existsSync(refDir) && statSync(refDir).isDirectory()
    ? readdirSync(refDir).filter(f => f.endsWith('.md')) : [];
  if (refMd) { r += 9; if ((refMd.match(/^#{1,4}\s/gm) || []).length >= 2) r += 4; }
  else if (refDirMds.length) { r += 9; if (refDirMds.length >= 2 || read(join(refDir, refDirMds[0])).length > 400) r += 4; }
  else missing.push('reference(.md|references/) fehlt');
  got.reference = { got: r, max: AXES.reference };

  // --- examples.md (12) ---
  let e = 0;
  const exMd = read(join(skillDir, 'examples.md'));
  if (exMd) { e += 7; if (/```/.test(exMd)) e += 5; }
  else missing.push('examples.md fehlt');
  got.examples = { got: e, max: AXES.examples };

  // --- evals (18) ---
  let ev = 0;
  const casesFile = join(skillDir, 'evals', 'cases.json');
  if (existsSync(casesFile)) {
    ev += 7;
    try {
      const cases = JSON.parse(read(casesFile));
      if (Array.isArray(cases) && cases.length >= 3) ev += 6;
      if (Array.isArray(cases) && cases.some(c => Array.isArray(c.files) && c.files.length)) ev += 5;
    } catch { /* malformed → keep 7 */ }
  } else missing.push('evals/cases.json fehlt');
  got.evals = { got: ev, max: AXES.evals };

  // --- scripts (15) ---
  let s = 0;
  const scriptsDir = join(skillDir, 'scripts');
  if (existsSync(scriptsDir) && statSync(scriptsDir).isDirectory()) {
    const scripts = readdirSync(scriptsDir).filter(f => f.endsWith('.mjs'));
    if (scripts.length) {
      s += 7;
      const first = read(join(scriptsDir, scripts[0]));
      if (/^#!/.test(first)) s += 3;
      let allOk = true;
      for (const sc of scripts) {
        try { execSync(`node --check ${JSON.stringify(join(scriptsDir, sc))}`, { stdio: 'ignore' }); }
        catch { allOk = false; }
      }
      if (allOk) s += 5;
    }
  }
  got.scripts = { got: s, max: AXES.scripts };

  const total = Object.values(got).reduce((a, x) => a + x.got, 0);
  const pct = Math.round(total);
  return { stars: starsFor(pct), pct, axes: got, missing };
}

/** Score every skill in a marketplace → sorted array. */
export function scoreMarketplace(mpAbs) {
  const pluginsDir = join(mpAbs, 'plugins');
  const rows = [];
  if (!existsSync(pluginsDir)) return rows;
  for (const plugin of readdirSync(pluginsDir).filter(d => statSync(join(pluginsDir, d)).isDirectory())) {
    const skillsDir = join(pluginsDir, plugin, 'skills');
    if (!existsSync(skillsDir)) continue;
    for (const skill of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
      const dir = join(skillsDir, skill);
      if (!existsSync(join(dir, 'SKILL.md'))) continue;
      rows.push({ plugin, skill, dir, ...scoreSkill(dir) });
    }
  }
  return rows.sort((a, b) => b.pct - a.pct || a.plugin.localeCompare(b.plugin));
}

const bar = (n, w = 20) => '█'.repeat(Math.round(n / 100 * w)).padEnd(w, '░');

export function renderHistogram(rows, mpName) {
  const buckets = [5, 4, 3, 2, 1, 0].map(star => ({ star, items: rows.filter(r => r.stars === star) }));
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
  const lines = [`\n${mpName} — Skill-Reifegrad (${rows.length} Skills, ⌀ ${avg}%)`];
  for (const b of buckets) {
    lines.push(`  ${b.star}★  ${bar(b.items.length / Math.max(1, rows.length) * 100)} ${String(b.items.length).padStart(3)}`);
  }
  return lines.join('\n');
}

export function renderMarkdown(rows) {
  const allRows = [...rows].sort((a, b) => b.pct - a.pct || `${a.plugin}/${a.skill}`.localeCompare(`${b.plugin}/${b.skill}`));
  const total = allRows.length;
  const avg = total ? Math.round(allRows.reduce((a, r) => a + r.pct, 0) / total) : 0;
  const dist = [5, 4, 3, 2, 1, 0].map(s => `${s}★: ${allRows.filter(r => r.stars === s).length}`).join(' · ');
  const out = [
    '# Skill-Maturity (auto-generiert)',
    '',
    '> **DO NOT EDIT** — regenerieren mit `node tools/validate-plugins.mjs <mp> --maturity-md docs/skill-maturity.md`.',
    `> ${total} Skills · ⌀ ${avg}% · Verteilung: ${dist}`,
    '>',
    '> Gegenstück: `docs/skill-uplift-tracker.md` (manuell — *Absicht/Wellenplan*). Diese Datei = *Ist-Stand*.',
    '',
    '| ★ | % | Plugin / Skill | Fehlt |',
    '|---|---:|---|---|',
  ];
  for (const r of allRows) {
    const miss = r.missing.length ? r.missing.join('; ') : '—';
    out.push(`| ${r.stars}★ | ${r.pct} | \`${r.plugin}/${r.skill}\` | ${miss} |`);
  }
  out.push('');
  return out.join('\n');
}
