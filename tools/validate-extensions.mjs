#!/usr/bin/env node
// Validator für die experimentellen Copilot-CLI-Extensions (Ausführungsplan §7 / §6.1).
// Prüft je host/<name>/: extension.mjs vorhanden + node --check; bridge.mjs-Konsistenz;
// Manifest-Kontrakt via `dotnet run -- --print-manifest` (offline); Versions-Triple.
// Findings-Tiers: error | warning | hint. --strict ⇒ warning zählt als Fehler.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXT_ROOT = join(ROOT, "extensions");
const HOST = join(EXT_ROOT, "host");
const STRICT = process.argv.includes("--strict");

const findings = [];
const add = (tier, where, msg) => findings.push({ tier, where, msg });

const KNOWN_HOOKS = new Set([
  "preToolUse", "postToolUse", "postToolUseFailure", "userPromptSubmitted",
  "sessionStart", "sessionEnd", "errorOccurred",
]);
const HEADS = ["mkc-work-guardian", "mkc-work-sentinel", "mkc-work-flow", "mkc-work-recorder"];
const PROJ = { "mkc-work-guardian": "Guardian", "mkc-work-sentinel": "Sentinel", "mkc-work-flow": "Flow", "mkc-work-recorder": "Recorder" };

function hasDotnet() {
  try { execFileSync("dotnet", ["--version"], { stdio: "ignore" }); return true; }
  catch { return false; }
}

function checkVersionsTriple() {
  const versionsPath = join(EXT_ROOT, "versions.json");
  if (!existsSync(versionsPath)) return add("error", "versions.json", "fehlt");
  const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
  if (versions.bridgeProtocol !== 1) add("warning", "versions.json", `bridgeProtocol ${versions.bridgeProtocol} != 1`);
  const bridge = readFileSync(join(HOST, "lib", "bridge.mjs"), "utf8");
  if (!bridge.includes("mkc-bridge") && !bridge.includes('MKC_BRIDGE_V: "1"'))
    add("warning", "bridge.mjs", "kein Protokoll-Marker gefunden");
  const msgCs = readFileSync(join(EXT_ROOT, "src", "Mkc.Copilot.Extensions.Core", "Bridge", "BridgeMessage.cs"), "utf8");
  if (!msgCs.includes("Version = 1")) add("hint", "BridgeMessage.cs", "Protokoll-Version nicht als 1 erkennbar");
}

function checkHead(name) {
  const dir = join(HOST, name);
  if (!existsSync(dir)) return add("error", name, "host-Verzeichnis fehlt");

  const extMjs = join(dir, "extension.mjs");
  if (!existsSync(extMjs)) { add("error", name, "extension.mjs fehlt"); return; }
  try { execFileSync("node", ["--check", extMjs], { stdio: "ignore" }); }
  catch { add("error", name, "extension.mjs: Syntaxfehler (node --check)"); }

  const bridgeMjs = join(dir, "bridge.mjs");
  if (!existsSync(bridgeMjs)) add("error", name, "bridge.mjs fehlt");
  else {
    const content = readFileSync(bridgeMjs, "utf8").trim();
    const isReExport = content.includes('from "../lib/bridge.mjs"');
    const isMaterialized = content.includes("startBridge");
    if (!isReExport && !isMaterialized)
      add("warning", name, "bridge.mjs ist weder Re-Export noch materialisiert");
  }

  // Manifest-Kontrakt offline prüfen
  if (hasDotnet()) {
    try {
      const out = execFileSync("dotnet",
        ["run", "--project", join(EXT_ROOT, "src", `Mkc.Copilot.Extensions.${PROJ[name]}`), "-c", "Release", "--", "--print-manifest"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const manifest = JSON.parse(out.trim().split("\n").pop());
      if (manifest.name !== name) add("error", name, `Manifest-Name '${manifest.name}' != '${name}'`);
      if (manifest.status !== "experimental") add("warning", name, "status != 'experimental'");
      for (const h of manifest.hooks ?? [])
        if (!KNOWN_HOOKS.has(h)) add("error", name, `unbekannter Hook: ${h}`);
      for (const t of manifest.tools ?? [])
        if (!t.inputSchema || typeof t.inputSchema !== "object") add("warning", name, `Tool '${t.name}' ohne gültiges inputSchema`);
    } catch (e) {
      add("warning", name, `--print-manifest fehlgeschlagen: ${String(e.message).slice(0, 80)}`);
    }
  } else {
    add("warning", name, "dotnet nicht verfügbar — Manifest-Kontrakt nicht geprüft");
  }
}

checkVersionsTriple();
for (const name of HEADS) checkHead(name);

// Unerwartete host-Verzeichnisse melden
if (existsSync(HOST))
  for (const entry of readdirSync(HOST, { withFileTypes: true }))
    if (entry.isDirectory() && entry.name !== "lib" && !HEADS.includes(entry.name))
      add("hint", entry.name, "unbekanntes host-Verzeichnis");

const errors = findings.filter(f => f.tier === "error");
const warnings = findings.filter(f => f.tier === "warning");
const hints = findings.filter(f => f.tier === "hint");

for (const f of findings) console.log(`[${f.tier}] ${f.where}: ${f.msg}`);
console.log(`\n${errors.length} error, ${warnings.length} warning, ${hints.length} hint`);

const failed = errors.length > 0 || (STRICT && warnings.length > 0);
process.exit(failed ? 1 : 0);
