#!/usr/bin/env node
/**
 * Validates plugins/skills/agents/commands against the GitHub Copilot CLI spec (First-Party).
 *
 * Findings are tiered:
 *   error   → Copilot CLI cannot load it (missing field, broken schema, missing referenced file)
 *   warning → only works in another AI product (Claude/ChatGPT/Gemini) or nowhere
 *   hint    → works in a sibling IDE (VS Code / Visual Studio), just not the CLI  (informational)
 *
 * Usage:
 *   node tools/validate-plugins.mjs <marketplace-path>       # whole marketplace (default)
 *   node tools/validate-plugins.mjs --plugin  <plugin-dir>
 *   node tools/validate-plugins.mjs --skill   <skill-dir|SKILL.md>
 *   node tools/validate-plugins.mjs --agent   <file.agent.md>
 *   node tools/validate-plugins.mjs --command <file.md>
 *   node tools/validate-plugins.mjs --changed-only [base]     # only git-changed items (default base: HEAD)
 *   flags: --strict (warnings→errors) · --no-hints · --format json
 * Exit 0 = no errors (warnings ok unless --strict), Exit 1 = errors (or warnings under --strict).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { execSync } from 'child_process';
import {
  ENV_LABELS, envList,
  classifyFrontmatterField, classifyCommandField, classifyAgentField, classifyAgentTool,
  SKILL_OK_FIELDS,
} from './lib/field-taxonomy.mjs';
import { scoreMarketplace, renderHistogram, renderMarkdown } from './lib/maturity.mjs';
import { writeFileSync } from 'fs';

const REQUIRED_PLUGIN_FIELDS = ['name', 'description', 'version', 'author', 'license'];
const REQUIRED_MARKETPLACE_FIELDS = ['name', 'plugins'];
const RESERVED_NAME_WORDS = ['anthropic', 'claude'];
const VALID_HOOK_EVENTS = new Set([
  'sessionStart', 'sessionEnd', 'userPromptSubmitted', 'preToolUse', 'postToolUse',
  'errorOccurred', 'subagentStart', 'PermissionRequest',
]);

// ---------- findings ----------
const mkCtx = () => ({ errors: [], warnings: [], hints: [] });
const err  = (ctx, m) => ctx.errors.push(m);
const warn = (ctx, m) => ctx.warnings.push(m);
const hint = (ctx, m) => ctx.hints.push(m);

const CLI = ENV_LABELS['copilot-cli'];
// Turn a taxonomy classification into a tiered finding.
function reportClassified(ctx, label, kind, name, cls) {
  if (cls.level === 'ok') return;
  const note = cls.note ? ` ${cls.note}` : '';
  if (cls.level === 'hint') {
    hint(ctx, `${label}: ${kind} "${name}" wird von ${envList(cls.supportedIn)} interpretiert, nicht von ${CLI}.${note}`);
  } else {
    const where = cls.supportedIn.length ? `wirkt nur in ${envList(cls.supportedIn)}` : 'wird von keiner bekannten Umgebung interpretiert';
    warn(ctx, `${label}: ${kind} "${name}" ${where} — ${CLI} (First-Party) ignoriert es.${note}`);
  }
}

// ---------- helpers ----------
function readJson(filePath) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); }
  catch (e) { return { __error: e.message }; }
}

/** Top-level frontmatter keys, in document order. */
function frontmatterKeys(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const keys = [];
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z_][\w-]*):/);
    if (km) keys.push(km[1]);
  }
  return keys;
}

/** name/description values — handles inline, quoted, and block scalars (>-, |). */
function parseFrontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const fm = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z_][\w-]*):\s?(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    if (key !== 'name' && key !== 'description') continue;
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
    fm[key] = val.replace(/\s+/g, ' ').trim();
  }
  return fm;
}

// ---------- skill ----------
function validateSkillDir(skillDir, pluginName, ref, ctx) {
  const label = `[${pluginName}] ${ref}`;
  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) { err(ctx, `${label} Skill directory not found`); return; }
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) { err(ctx, `${label} SKILL.md missing`); return; }
  const fm = parseFrontmatter(skillMd);
  if (!fm) { err(ctx, `${label}SKILL.md missing YAML frontmatter`); return; }
  if (!fm.name) err(ctx, `${label}SKILL.md frontmatter missing "name"`);
  else {
    if (fm.name.length > 64) err(ctx, `${label} name >64 chars`);
    if (!/^[a-z0-9-]+$/.test(fm.name)) err(ctx, `${label} name must be lowercase/digits/hyphen: "${fm.name}"`);
    if (RESERVED_NAME_WORDS.some(w => fm.name.includes(w))) err(ctx, `${label} name uses reserved word: "${fm.name}"`);
  }
  if (!fm.description) err(ctx, `${label}SKILL.md frontmatter missing "description"`);
  else if (fm.description.length > 1024) err(ctx, `${label} description >1024 chars`);

  // classify every frontmatter field (tiered — no longer a hard error)
  for (const key of frontmatterKeys(skillMd) ?? []) {
    reportClassified(ctx, `${label}SKILL.md`, 'Feld', key, classifyFrontmatterField(key));
  }
}

// ---------- agent ----------
function validateAgent(file, pluginName, ref, ctx) {
  const label = `[${pluginName}] ${ref}`;
  if (!existsSync(file)) { err(ctx, `${label} Agent file not found`); return; }
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) { err(ctx, `${label} agent missing YAML frontmatter`); return; }

  // frontmatter fields
  for (const key of frontmatterKeys(file) ?? []) {
    reportClassified(ctx, label, 'Agent-Feld', key, classifyAgentField(key));
  }
  // tools list
  const lines = fm[1].split(/\r?\n/);
  const ti = lines.findIndex(l => /^tools:\s*$/.test(l));
  if (ti !== -1) {
    for (let j = ti + 1; j < lines.length; j++) {
      const m = lines[j].match(/^\s+-\s+(.+?)\s*$/);
      if (!m) break;
      const tool = m[1].replace(/^['"]|['"]$/g, '');
      reportClassified(ctx, label, 'Agent-Tool', tool, classifyAgentTool(tool));
    }
  }
}

// ---------- command ----------
function validateCommand(file, pluginName, ref, ctx) {
  const label = `[${pluginName}] ${ref}`;
  if (!existsSync(file)) { err(ctx, `${label} Command file not found`); return; }
  for (const key of frontmatterKeys(file) ?? []) {
    reportClassified(ctx, label, 'Command-Feld', key, classifyCommandField(key));
  }
}

// ---------- hooks ----------
function validateHooks(hooksPath, pluginDir, pluginName, ctx) {
  const label = `[${pluginName}] hooks.json`;
  const h = readJson(hooksPath);
  if (h.__error) { err(ctx, `${label}: Invalid JSON: ${h.__error}`); return; }
  if (h.version !== 1) err(ctx, `${label}: missing "version": 1`);
  if (Array.isArray(h.hooks) || typeof h.hooks !== 'object' || h.hooks === null) {
    err(ctx, `${label}: "hooks" must be an object keyed by event name (not an array)`); return;
  }
  for (const [event, entries] of Object.entries(h.hooks)) {
    if (!VALID_HOOK_EVENTS.has(event)) err(ctx, `${label}: unknown event "${event}"`);
    if (!Array.isArray(entries)) { err(ctx, `${label}: "${event}" must map to an array`); continue; }
    for (const e of entries) {
      if (!e || e.type !== 'command') err(ctx, `${label}: "${event}" entry needs "type": "command"`);
      if (!e || (!e.bash && !e.powershell)) err(ctx, `${label}: "${event}" entry needs "bash" and/or "powershell"`);
      for (const cmd of [e?.bash, e?.powershell]) {
        const m = typeof cmd === 'string' && cmd.match(/\{\{plugin_data_dir\}\}\/(\S+?\.(?:sh|ps1))/);
        if (m && !existsSync(join(pluginDir, m[1]))) err(ctx, `${label}: referenced script not found: ${m[1]}`);
      }
    }
  }
}

// ---------- plugin ----------
function validatePlugin(pluginDir, pluginName, ctx) {
  const label = `[${pluginName}]`;
  const manifestPath = join(pluginDir, '.github', 'plugin', 'plugin.json');
  if (!existsSync(manifestPath)) { err(ctx, `${label} Missing canonical manifest: .github/plugin/plugin.json`); return; }
  const m = readJson(manifestPath);
  if (m.__error) { err(ctx, `${label} Invalid JSON in plugin.json: ${m.__error}`); return; }

  for (const f of REQUIRED_PLUGIN_FIELDS) if (m[f] === undefined) err(ctx, `${label} plugin.json missing required field: "${f}"`);
  if (m.author && typeof m.author !== 'object') err(ctx, `${label} "author" must be an object { name }`);
  if (m.author && typeof m.author === 'object' && !m.author.name) err(ctx, `${label} "author.name" required`);
  if (!m.repository) err(ctx, `${label} missing "repository"`);

  const refExists = (ref, isDir) => {
    const full = join(pluginDir, ref);
    return existsSync(full) && (isDir ? statSync(full).isDirectory() : statSync(full).isFile());
  };
  for (const ref of m.agents ?? []) {
    if (!refExists(ref, false)) { err(ctx, `${label} Agent not found: ${ref}`); continue; }
    validateAgent(join(pluginDir, ref), pluginName, ref, ctx);
  }
  for (const ref of m.commands ?? []) {
    if (!refExists(ref, false)) { err(ctx, `${label} Command not found: ${ref}`); continue; }
    validateCommand(join(pluginDir, ref), pluginName, ref, ctx);
  }
  for (const ref of m.skills ?? []) validateSkillDir(join(pluginDir, ref), pluginName, ref, ctx);

  const mcpPath = join(pluginDir, '.mcp.json');
  if (existsSync(mcpPath)) {
    const mcp = readJson(mcpPath);
    if (mcp.__error) err(ctx, `${label} Invalid JSON in .mcp.json: ${mcp.__error}`);
    else if (!mcp.mcpServers) err(ctx, `${label} .mcp.json missing "mcpServers"`);
  }
  const hooksPath = join(pluginDir, 'hooks.json');
  if (existsSync(hooksPath)) validateHooks(hooksPath, pluginDir, pluginName, ctx);
}

// ---------- marketplace ----------
function validateMarketplace(marketplacePath, ctx) {
  const abs = resolve(marketplacePath);
  if (!existsSync(abs)) { err(ctx, `not found: ${abs}`); return; }
  const mpJson = join(abs, '.github', 'plugin', 'marketplace.json');
  if (!existsSync(mpJson)) { err(ctx, `Missing .github/plugin/marketplace.json`); return; }
  const market = readJson(mpJson);
  if (market.__error) { err(ctx, `Invalid marketplace.json: ${market.__error}`); return; }
  for (const f of REQUIRED_MARKETPLACE_FIELDS) if (!market[f]) err(ctx, `marketplace.json missing "${f}"`);

  const pluginsDir = join(abs, market.metadata?.pluginRoot ?? 'plugins');
  if (!existsSync(pluginsDir)) { err(ctx, `Plugin root not found: ${pluginsDir}`); return; }

  const listed = new Set();
  for (const p of market.plugins ?? []) {
    if (!p.source) { err(ctx, `Marketplace plugin entry missing "source": ${JSON.stringify(p)}`); continue; }
    listed.add(p.source);
    // version drift: plugin.json ist Quelle der Wahrheit; marketplace.json muss folgen
    const manifest = readJson(join(abs, p.source, '.github', 'plugin', 'plugin.json'));
    if (!manifest.__error && p.version && manifest.version && p.version !== manifest.version)
      warn(ctx, `Version drift "${p.name ?? p.source}": marketplace.json ${p.version} ≠ plugin.json ${manifest.version}`);
    validatePlugin(join(abs, p.source), p.name ?? p.source, ctx);
  }
  for (const d of readdirSync(pluginsDir).filter(x => statSync(join(pluginsDir, x)).isDirectory())) {
    if (!listed.has(`plugins/${d}`) && existsSync(join(pluginsDir, d, '.github', 'plugin', 'plugin.json')))
      warn(ctx, `Plugin "${d}" has a manifest but is not listed in marketplace.json`);
  }
}

// ---------- scoped helpers ----------
// derive a readable plugin label from any path inside a plugin
function pluginNameFor(p) {
  const parts = resolve(p).split('/');
  const i = parts.lastIndexOf('plugins');
  return i >= 0 && parts[i + 1] ? parts[i + 1] : basename(dirname(p));
}
function validateSkillScoped(p, ctx) {
  const dir = p.endsWith('SKILL.md') ? dirname(p) : p;
  validateSkillDir(resolve(dir), pluginNameFor(dir), `./${basename(dir)}/`, ctx);
}
function validatePluginScoped(p, ctx) { validatePlugin(resolve(p), basename(resolve(p)), ctx); }
function validateAgentScoped(p, ctx) { validateAgent(resolve(p), pluginNameFor(p), `./${basename(p)}`, ctx); }
function validateCommandScoped(p, ctx) { validateCommand(resolve(p), pluginNameFor(p), `./${basename(p)}`, ctx); }

// map git-changed files → scoped validations (dedup by target)
function validateChanged(base, ctx) {
  let files = [];
  try {
    const out = execSync(`git diff --name-only ${base} -- 'marketplaces/**'`, { encoding: 'utf8' });
    files = out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (e) { err(ctx, `--changed-only: git diff failed (${e.message})`); return; }
  const skills = new Set(), agents = new Set(), commands = new Set();
  for (const f of files) {
    if (!existsSync(f)) continue;
    const mSkill = f.match(/^(.*\/skills\/[^/]+)\//);
    if (mSkill) { skills.add(mSkill[1]); continue; }
    if (f.endsWith('.agent.md')) { agents.add(f); continue; }
    if (/\/commands\/[^/]+\.md$/.test(f)) { commands.add(f); continue; }
  }
  if (!skills.size && !agents.size && !commands.size) { console.log('(--changed-only: keine relevanten Änderungen)'); return; }
  for (const s of skills) validateSkillScoped(s, ctx);
  for (const a of agents) validateAgentScoped(a, ctx);
  for (const c of commands) validateCommandScoped(c, ctx);
}

// ---------- CLI ----------
function parseArgs(argv) {
  const o = { mode: 'marketplace', target: null, strict: false, hints: true, format: 'text', maturity: false, maturityMd: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plugin')       { o.mode = 'plugin';  o.target = argv[++i]; }
    else if (a === '--skill')   { o.mode = 'skill';   o.target = argv[++i]; }
    else if (a === '--agent')   { o.mode = 'agent';   o.target = argv[++i]; }
    else if (a === '--command') { o.mode = 'command'; o.target = argv[++i]; }
    else if (a === '--changed-only') { o.mode = 'changed'; if (argv[i + 1] && !argv[i + 1].startsWith('--')) o.target = argv[++i]; }
    else if (a === '--maturity') o.maturity = true;
    else if (a === '--maturity-md') o.maturityMd = argv[++i];
    else if (a === '--maturity-gaps') o.maturityGaps = true;
    else if (a === '--strict')  o.strict = true;
    else if (a === '--no-hints') o.hints = false;
    else if (a === '--format')  o.format = argv[++i];
    else if (!a.startsWith('--') && o.mode === 'marketplace' && !o.target) o.target = a;
  }
  return o;
}

const opt = parseArgs(process.argv);

// discover marketplaces under ./marketplaces (dirs with a marketplace.json)
function allMarketplaces() {
  const root = resolve('marketplaces');
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map(d => join(root, d))
    .filter(d => existsSync(join(d, '.github', 'plugin', 'marketplace.json')));
}

// ---- maturity mode (reporting only; no exit-code impact) ----
if (opt.maturity || opt.maturityMd) {
  const mps = (opt.target && existsSync(join(resolve(opt.target), '.github', 'plugin', 'marketplace.json')))
    ? [resolve(opt.target)] : allMarketplaces();
  const all = [];
  for (const mp of mps) {
    const rows = scoreMarketplace(mp).map(r => ({ ...r, mp: basename(mp) }));
    all.push(...rows);
    if (opt.maturity) console.log(renderHistogram(rows, basename(mp)));
  }
  if (opt.maturity) {
    const avg = all.length ? Math.round(all.reduce((a, r) => a + r.pct, 0) / all.length) : 0;
    console.log(`\nGesamt: ${all.length} Skills · ⌀ ${avg}% · <3★: ${all.filter(r => r.stars < 3).length}\n`);
  }
  if (opt.maturityMd) {
    writeFileSync(opt.maturityMd, renderMarkdown(all));
    console.log(`✓  ${opt.maturityMd} geschrieben (${all.length} Skills).`);
  }
  process.exit(0);
}
// ---- maturity gaps: Regressionen gegen den committeten Stand (git show HEAD:) + optionale Ziele ----
if (opt.maturityGaps) {
  const mps = (opt.target && existsSync(join(resolve(opt.target), '.github', 'plugin', 'marketplace.json')))
    ? [resolve(opt.target)] : allMarketplaces();
  const current = new Map();
  for (const mp of mps) for (const r of scoreMarketplace(mp)) current.set(`${basename(mp)}/${r.plugin}/${r.skill}`, r);

  // Baseline: der committete docs/skill-maturity.md (| ★ | % | `plugin/skill` | … |)
  const baseline = new Map();
  try {
    const md = execSync('git show HEAD:docs/skill-maturity.md', { encoding: 'utf8' });
    for (const m of md.matchAll(/^\|\s*\d★\s*\|\s*(\d+)\s*\|\s*`([^`]+)`/gm)) baseline.set(m[2], Number(m[1]));
  } catch { /* keine Baseline (frisches Repo) → nur Ziele prüfen */ }

  // Optionale Mindestziele: docs/skill-targets.json { "plugin/skill": <min-%>, "*": <min-%> }
  let targets = {};
  try { targets = JSON.parse(readFileSync('docs/skill-targets.json', 'utf8')); } catch { /* optional */ }

  let failed = 0;
  for (const [key, r] of current) {
    const base = baseline.get(key);
    if (base !== undefined && r.pct < base) {
      console.log(`REGRESSION  ${key}: ${base}% → ${r.pct}%`);
      failed++;
    }
    const min = targets[key] ?? targets['*'];
    if (min !== undefined && r.pct < min) {
      console.log(`UNTER ZIEL  ${key}: ${r.pct}% < Ziel ${min}%`);
      failed++;
    }
  }
  if (failed) { console.log(`\n✗  ${failed} Maturity-Gap(s).`); process.exit(1); }
  console.log(`✓  Keine Maturity-Regressionen (${current.size} Skills gegen Baseline/Ziele geprüft).`);
  process.exit(0);
}

if (opt.mode !== 'changed' && !opt.target) {
  console.error('Usage: node tools/validate-plugins.mjs <marketplace-path> | --skill|--plugin|--agent|--command <path> | --changed-only [base]');
  console.error('       flags: --strict  --no-hints  --format json  --maturity  --maturity-md <file>  --maturity-gaps');
  process.exit(1);
}

const ctx = mkCtx();
const scopeLabel = {
  marketplace: `marketplace ${opt.target}`, plugin: `plugin ${opt.target}`, skill: `skill ${opt.target}`,
  agent: `agent ${opt.target}`, command: `command ${opt.target}`, changed: `changed (${opt.target ?? 'HEAD'})`,
}[opt.mode];

switch (opt.mode) {
  case 'marketplace': validateMarketplace(opt.target, ctx); break;
  case 'plugin':      validatePluginScoped(opt.target, ctx); break;
  case 'skill':       validateSkillScoped(opt.target, ctx); break;
  case 'agent':       validateAgentScoped(opt.target, ctx); break;
  case 'command':     validateCommandScoped(opt.target, ctx); break;
  case 'changed':     validateChanged(opt.target ?? 'HEAD', ctx); break;
}

// under --strict, warnings are promoted to errors for the exit code
const hardErrors = opt.strict ? [...ctx.errors, ...ctx.warnings] : ctx.errors;

if (opt.format === 'json') {
  console.log(JSON.stringify({ scope: scopeLabel, ...ctx, strict: opt.strict, failed: hardErrors.length > 0 }, null, 2));
  process.exit(hardErrors.length ? 1 : 0);
}

console.log(`\nValidating ${scopeLabel}\n`);
if (opt.hints && ctx.hints.length) { console.log('Hints:'); ctx.hints.forEach(h => console.log(`  ℹ  ${h}`)); console.log(); }
if (ctx.warnings.length) { console.warn(`Warnings${opt.strict ? ' (strict → errors)' : ''}:`); ctx.warnings.forEach(w => console.warn(`  ⚠  ${w}`)); console.log(); }
if (ctx.errors.length) { console.error('Errors:'); ctx.errors.forEach(e => console.error(`  ✗  ${e}`)); }

if (hardErrors.length) {
  console.error(`\n${hardErrors.length} problem(s). Validation FAILED.`);
  process.exit(1);
}
console.log(`✓  Validation passed (${ctx.warnings.length} warning(s), ${ctx.hints.length} hint(s)).`);
process.exit(0);
