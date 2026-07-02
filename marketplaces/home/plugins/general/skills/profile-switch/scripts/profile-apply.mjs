#!/usr/bin/env node
/**
 * profile-apply.mjs — deterministically compute the MCP enable/disable set for a profile.
 *
 * Copilot CLI actually toggles MCP servers at runtime (no restart) via `/mcp enable <name>` /
 * `/mcp disable <name>` (interactive) or `copilot mcp enable|disable <name>` (terminal). This script
 * is the anti-drift core: it reads policy/profiles.json, computes for the chosen profile which servers
 * to ENABLE and which to DISABLE (the rest of the managed universe), and emits the exact commands.
 * The agent then executes them — it does not guess the set.
 *
 * Usage:
 *   node profile-apply.mjs <profile> [--profiles <profiles.json>] [--state <state.json>] [--form cli|slash]
 * Output (stdout): the enable/disable command list (+ a one-line summary on stderr).
 * Exit: 0 ok · 2 bad usage/unknown profile · 3 unreadable profiles.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const errMsg = e => (e instanceof Error ? e.message : String(e));
const __dir = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const profile = argv.find(a => !a.startsWith('--'));
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const die = (c, m) => { process.stderr.write(`profile-apply: ${m}\n`); process.exit(c); };

if (!profile) die(2, 'usage: profile-apply.mjs <profile> [--profiles p] [--state s] [--form cli|slash]');

// default profiles.json: general/policy/profiles.json (three levels up from scripts/)
const profilesPath = opt('profiles', join(__dir, '..', '..', '..', 'policy', 'profiles.json'));
let cfg;
try { cfg = JSON.parse(readFileSync(profilesPath, 'utf8')); }
catch (e) { die(3, `cannot read profiles (${errMsg(e)}) at ${profilesPath}`); }

const profiles = cfg.profiles || {};
if (!profiles[profile]) die(2, `unknown profile "${profile}" (have: ${Object.keys(profiles).join(', ')})`);

// managed universe = union of all servers named across all profiles
const universe = [...new Set(Object.values(profiles).flatMap(p => p.mcpServers || []))].sort();
const enable = [...new Set(profiles[profile].mcpServers || [])].sort();
const disable = universe.filter(s => !enable.includes(s));

const form = opt('form', 'cli'); // cli → `copilot mcp …`  ·  slash → `/mcp …` (interactive)
const cmd = (verb, name) => (form === 'slash' ? `/mcp ${verb} ${name}` : `copilot mcp ${verb} ${name}`);

const lines = [];
lines.push(`# Profil "${profile}" — ${profiles[profile].description || ''}`.trimEnd());
lines.push(`# enable: ${enable.join(', ') || '(keine)'}`);
lines.push(`# disable: ${disable.join(', ') || '(keine)'}`);
for (const s of disable) lines.push(cmd('disable', s));
for (const s of enable) lines.push(cmd('enable', s));
process.stdout.write(lines.join('\n') + '\n');

// persist the active profile (deterministic; optional but useful for /profile show)
const statePath = opt('state', join('.copilot', 'state', 'profile.json'));
try {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify({ profile, enable, disable, appliedAt: new Date().toISOString() }, null, 2));
} catch (e) { process.stderr.write(`profile-apply: could not persist state (${errMsg(e)})\n`); }

process.stderr.write(`profile-apply: ${profile} → enable ${enable.length}, disable ${disable.length}.\n`);
