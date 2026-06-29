#!/usr/bin/env node
/**
 * Validates a marketplace against the GitHub Copilot CLI plugin spec.
 * Canonical plugin manifest location: plugins/<name>/.github/plugin/plugin.json
 * Usage: node tools/validate-plugins.mjs <marketplace-path>
 * Exit 0 = valid, Exit 1 = errors found.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const REQUIRED_PLUGIN_FIELDS = ['name', 'description', 'version', 'author', 'license'];
const REQUIRED_MARKETPLACE_FIELDS = ['name', 'plugins'];
const RESERVED_NAME_WORDS = ['anthropic', 'claude'];

function readJson(filePath) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); }
  catch (e) { return { __error: e.message }; }
}

/** Parse YAML frontmatter (name/description) — handles inline, quoted, and block scalars (>-, |). */
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

function validateSkillDir(skillDir, pluginName, ref, errors, warnings) {
  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
    errors.push(`[${pluginName}] Skill directory not found: ${ref}`);
    return;
  }
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) {
    errors.push(`[${pluginName}] SKILL.md missing in ${ref}`);
    return;
  }
  const fm = parseFrontmatter(skillMd);
  if (!fm) { errors.push(`[${pluginName}] ${ref}SKILL.md missing YAML frontmatter`); return; }
  if (!fm.name) errors.push(`[${pluginName}] ${ref}SKILL.md frontmatter missing "name"`);
  else {
    if (fm.name.length > 64) errors.push(`[${pluginName}] ${ref} name >64 chars`);
    if (!/^[a-z0-9-]+$/.test(fm.name)) errors.push(`[${pluginName}] ${ref} name must be lowercase/digits/hyphen: "${fm.name}"`);
    if (RESERVED_NAME_WORDS.some(w => fm.name.includes(w))) errors.push(`[${pluginName}] ${ref} name uses reserved word: "${fm.name}"`);
  }
  if (!fm.description) errors.push(`[${pluginName}] ${ref}SKILL.md frontmatter missing "description"`);
  else if (fm.description.length > 1024) errors.push(`[${pluginName}] ${ref} description >1024 chars`);
}

function validatePlugin(pluginDir, pluginName, errors, warnings) {
  const manifestPath = join(pluginDir, '.github', 'plugin', 'plugin.json');
  if (!existsSync(manifestPath)) {
    errors.push(`[${pluginName}] Missing canonical manifest: .github/plugin/plugin.json`);
    return;
  }
  const m = readJson(manifestPath);
  if (m.__error) { errors.push(`[${pluginName}] Invalid JSON in plugin.json: ${m.__error}`); return; }

  for (const f of REQUIRED_PLUGIN_FIELDS) {
    if (m[f] === undefined) errors.push(`[${pluginName}] plugin.json missing required field: "${f}"`);
  }
  if (m.author && typeof m.author !== 'object') errors.push(`[${pluginName}] "author" must be an object { name }`);
  if (m.author && typeof m.author === 'object' && !m.author.name) errors.push(`[${pluginName}] "author.name" required`);
  if (!m.repository) errors.push(`[${pluginName}] missing "repository"`);

  const refExists = (ref, isDir) => {
    const full = join(pluginDir, ref);
    return existsSync(full) && (isDir ? statSync(full).isDirectory() : statSync(full).isFile());
  };
  for (const ref of m.agents ?? []) if (!refExists(ref, false)) errors.push(`[${pluginName}] Agent not found: ${ref}`);
  for (const ref of m.commands ?? []) if (!refExists(ref, false)) errors.push(`[${pluginName}] Command not found: ${ref}`);
  for (const ref of m.skills ?? []) validateSkillDir(join(pluginDir, ref), pluginName, ref, errors, warnings);

  // .mcp.json / hooks.json sanity
  const mcpPath = join(pluginDir, '.mcp.json');
  if (existsSync(mcpPath)) {
    const mcp = readJson(mcpPath);
    if (mcp.__error) errors.push(`[${pluginName}] Invalid JSON in .mcp.json: ${mcp.__error}`);
    else if (!mcp.mcpServers) errors.push(`[${pluginName}] .mcp.json missing "mcpServers"`);
  }
  const hooksPath = join(pluginDir, 'hooks.json');
  if (existsSync(hooksPath) && readJson(hooksPath).__error) errors.push(`[${pluginName}] Invalid JSON in hooks.json`);
}

function validateMarketplace(marketplacePath) {
  const errors = [], warnings = [];
  const abs = resolve(marketplacePath);
  if (!existsSync(abs)) { console.error(`ERROR: not found: ${abs}`); process.exit(1); }

  const mpJson = join(abs, '.github', 'plugin', 'marketplace.json');
  if (!existsSync(mpJson)) { errors.push(`Missing .github/plugin/marketplace.json`); return { errors, warnings }; }
  const market = readJson(mpJson);
  if (market.__error) { errors.push(`Invalid marketplace.json: ${market.__error}`); return { errors, warnings }; }
  for (const f of REQUIRED_MARKETPLACE_FIELDS) if (!market[f]) errors.push(`marketplace.json missing "${f}"`);

  const pluginsDir = join(abs, market.metadata?.pluginRoot ?? 'plugins');
  if (!existsSync(pluginsDir)) { errors.push(`Plugin root not found: ${pluginsDir}`); return { errors, warnings }; }

  const listed = new Set();
  for (const p of market.plugins ?? []) {
    if (!p.source) { errors.push(`Marketplace plugin entry missing "source": ${JSON.stringify(p)}`); continue; }
    listed.add(p.source);
    validatePlugin(join(abs, p.source), p.name ?? p.source, errors, warnings);
  }
  // unlisted plugin dirs
  for (const d of readdirSync(pluginsDir).filter(x => statSync(join(pluginsDir, x)).isDirectory())) {
    if (!listed.has(`plugins/${d}`) && existsSync(join(pluginsDir, d, '.github', 'plugin', 'plugin.json')))
      warnings.push(`Plugin "${d}" has a manifest but is not listed in marketplace.json`);
  }
  return { errors, warnings };
}

const mp = process.argv[2];
if (!mp) { console.error('Usage: node tools/validate-plugins.mjs <marketplace-path>'); process.exit(1); }
console.log(`\nValidating marketplace: ${mp}\n`);
const { errors, warnings } = validateMarketplace(mp);
if (warnings.length) { console.warn('Warnings:'); warnings.forEach(w => console.warn(`  ⚠  ${w}`)); console.log(); }
if (errors.length) {
  console.error('Errors:'); errors.forEach(e => console.error(`  ✗  ${e}`));
  console.error(`\n${errors.length} error(s) found. Validation FAILED.`);
  process.exit(1);
}
console.log(`✓  Validation passed (${warnings.length} warning(s)).`);
process.exit(0);
