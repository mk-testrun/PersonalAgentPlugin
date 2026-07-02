#!/usr/bin/env node
// bootstrap.mjs — richtet eine Maschine (Home oder Work) auf dieses Monorepo ein.
//
//   node tools/bootstrap.mjs --profile home            # Dry-Run (Plan anzeigen)
//   node tools/bootstrap.mjs --profile work --apply    # Editor-Settings + MCP-Extras schreiben
//
// Optional: --vscode-dir <pfad> / --copilot-dir <pfad> überschreiben die Zielverzeichnisse
// (für Tests oder VS-Code-Insiders). Null Dependencies, idempotent.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Tiefer Merge: Objekte rekursiv, alles andere (inkl. Arrays) ersetzt `base`. */
export function deepMerge(base, overlay) {
  if (
    base && overlay &&
    typeof base === "object" && typeof overlay === "object" &&
    !Array.isArray(base) && !Array.isArray(overlay)
  ) {
    const out = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
      out[key] = key in out ? deepMerge(out[key], value) : value;
    }
    return out;
  }
  return overlay === undefined ? base : overlay;
}

/** Entfernt Kommentar-Keys ("// …") — sie dokumentieren die Quelldateien, gehören aber nicht ins Ziel. */
export function stripCommentKeys(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith("//")));
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** VS-Code-User-Verzeichnis der Plattform. */
export function vscodeUserDir(platform = process.platform, env = process.env, home = os.homedir()) {
  if (platform === "win32") return path.join(env.APPDATA ?? path.join(home, "AppData", "Roaming"), "Code", "User");
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "Code", "User");
  return path.join(env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "Code", "User");
}

export function loadProfile(name) {
  const file = path.join(REPO_ROOT, "profiles", name, "profile.json");
  if (!fs.existsSync(file)) {
    const available = fs.readdirSync(path.join(REPO_ROOT, "profiles"), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
    throw new Error(`Unbekanntes Profil "${name}". Verfügbar: ${available.join(", ")}`);
  }
  return readJson(file);
}

/** Ziel-Settings = bestehende User-Settings ⊕ shared ⊕ Profil-Overlay (nur verwaltete Keys). */
export function mergedEditorSettings(profile, existing = {}) {
  let managed = {};
  for (const rel of profile.editor.settings) {
    managed = deepMerge(managed, stripCommentKeys(readJson(path.join(REPO_ROOT, rel))));
  }
  return { merged: deepMerge(existing, managed), managed };
}

export function extensionIds(profile) {
  const ids = [];
  for (const rel of profile.editor.extensions) {
    for (const id of readJson(path.join(REPO_ROOT, rel)).recommendations ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** ~/.copilot/mcp-config.json ⊕ mcpExtras des Profils. */
export function mergedMcpConfig(profile, existing = {}) {
  const servers = { ...(existing.mcpServers ?? {}) };
  for (const [name, spec] of Object.entries(profile.mcpExtras ?? {})) {
    servers[name] = spec;
  }
  return { ...existing, mcpServers: servers };
}

export function copilotCommands(profile) {
  const marketplacePath = path.join(REPO_ROOT, profile.marketplace.path);
  return [
    `copilot plugin marketplace add ${marketplacePath}`,
    ...profile.plugins.map((p) => `copilot plugin install ${p}@${profile.marketplace.name}`),
  ];
}

function readJsonIfExists(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function run(argv, log = console.log) {
  const args = argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const profileName = opt("--profile");
  const apply = args.includes("--apply");
  if (!profileName) {
    log("Usage: node tools/bootstrap.mjs --profile <home|work> [--apply] [--vscode-dir p] [--copilot-dir p]");
    return 2;
  }

  const profile = loadProfile(profileName);
  const vsDir = opt("--vscode-dir") ?? vscodeUserDir();
  const copilotDir = opt("--copilot-dir") ?? path.join(os.homedir(), ".copilot");
  const settingsFile = path.join(vsDir, "settings.json");
  const mcpFile = path.join(copilotDir, "mcp-config.json");

  log(`# Bootstrap-Profil: ${profile.name} — ${profile.description}`);
  log(apply ? "# Modus: APPLY (schreibt Dateien)\n" : "# Modus: Dry-Run (nichts wird geschrieben; --apply zum Anwenden)\n");

  // 1) Editor-Settings
  const { merged, managed } = mergedEditorSettings(profile, readJsonIfExists(settingsFile));
  log(`## 1. VS-Code-Settings → ${settingsFile}`);
  log(`   verwaltete Keys: ${Object.keys(managed).join(", ")}`);
  if (apply) {
    writeJson(settingsFile, merged);
    log("   ✔ geschrieben");
  }

  // 2) Extensions (nur Kommandos drucken — bewusst kein Auto-Install)
  log("\n## 2. VS-Code-Extensions (manuell ausführen):");
  for (const id of extensionIds(profile)) log(`   code --install-extension ${id}`);

  // 3) Copilot-CLI: Marketplace + Plugins (CLI verwaltet eigenen State — Kommandos drucken)
  log("\n## 3. Copilot-CLI (manuell ausführen):");
  for (const cmd of copilotCommands(profile)) log(`   ${cmd}`);

  // 4) Globale MCP-Extras
  const extras = Object.keys(profile.mcpExtras ?? {});
  log(`\n## 4. Globale MCP-Extras → ${mcpFile}`);
  log(`   Server: ${extras.length ? extras.join(", ") : "(keine)"}`);
  if (apply && extras.length) {
    writeJson(mcpFile, mergedMcpConfig(profile, readJsonIfExists(mcpFile)));
    log("   ✔ geschrieben");
  }

  log("\nFertig. Der Bootstrap ist idempotent — nach jedem `git pull` erneut ausführbar.");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv);
}
