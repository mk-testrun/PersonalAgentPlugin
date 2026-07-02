import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  deepMerge,
  stripCommentKeys,
  vscodeUserDir,
  loadProfile,
  mergedEditorSettings,
  extensionIds,
  mergedMcpConfig,
  copilotCommands,
  run,
} from "../bootstrap.mjs";

test("deepMerge: Objekte rekursiv, Arrays/Skalare ersetzen", () => {
  const out = deepMerge(
    { a: 1, nest: { x: 1, y: 1 }, arr: [1, 2] },
    { b: 2, nest: { y: 9 }, arr: [3] }
  );
  assert.deepEqual(out, { a: 1, b: 2, nest: { x: 1, y: 9 }, arr: [3] });
});

test("stripCommentKeys entfernt //-Keys", () => {
  assert.deepEqual(stripCommentKeys({ "// _managed": "doc", "files.eol": "\n" }), { "files.eol": "\n" });
});

test("vscodeUserDir kennt alle drei Plattformen", () => {
  assert.equal(
    vscodeUserDir("win32", { APPDATA: "C:\\AD" }, "C:\\Users\\x"),
    path.join("C:\\AD", "Code", "User")
  );
  assert.equal(
    vscodeUserDir("darwin", {}, "/Users/x"),
    "/Users/x/Library/Application Support/Code/User"
  );
  assert.equal(vscodeUserDir("linux", {}, "/home/x"), "/home/x/.config/Code/User");
});

for (const name of ["home", "work"]) {
  test(`Profil ${name}: lädt, Editor-Dateien existieren, Merge funktioniert`, () => {
    const profile = loadProfile(name);
    assert.equal(profile.name, name);
    assert.ok(profile.marketplace.path.startsWith("marketplaces/"));
    assert.ok(profile.plugins.length > 0);

    const { merged, managed } = mergedEditorSettings(profile, { userKey: true });
    assert.equal(merged.userKey, true, "bestehende User-Settings bleiben erhalten");
    assert.equal(merged["files.eol"], "\n");
    assert.ok(!Object.keys(managed).some((k) => k.startsWith("//")), "keine Kommentar-Keys im Ziel");

    const ids = extensionIds(profile);
    assert.ok(ids.includes("editorconfig.editorconfig"));
    assert.equal(new Set(ids).size, ids.length, "keine doppelten Extension-IDs");

    const cmds = copilotCommands(profile);
    assert.ok(cmds[0].startsWith("copilot plugin marketplace add "));
    assert.equal(cmds.length, 1 + profile.plugins.length);
  });
}

test("Home- und Work-Overlay widersprechen sich bewusst (Theme), Baseline identisch", () => {
  const home = mergedEditorSettings(loadProfile("home")).managed;
  const work = mergedEditorSettings(loadProfile("work")).managed;
  assert.notEqual(home["workbench.colorTheme"], work["workbench.colorTheme"]);
  assert.equal(home["files.eol"], work["files.eol"]);
});

test("mergedMcpConfig: bestehende Server bleiben, Profil-Server werden aktualisiert", () => {
  const profile = { mcpExtras: { memory: { command: "npx" } } };
  const existing = { mcpServers: { memory: { command: "old" }, custom: { command: "keep" } }, other: 1 };
  const out = mergedMcpConfig(profile, existing);
  assert.equal(out.mcpServers.memory.command, "npx");
  assert.equal(out.mcpServers.custom.command, "keep");
  assert.equal(out.other, 1);
});

test("run --apply schreibt Settings + MCP-Extras idempotent in Zielverzeichnisse", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-test-"));
  const vsDir = path.join(tmp, "vscode");
  const cpDir = path.join(tmp, "copilot");
  const argv = ["node", "bootstrap.mjs", "--profile", "home", "--apply", "--vscode-dir", vsDir, "--copilot-dir", cpDir];

  const lines = [];
  assert.equal(run(argv, (l) => lines.push(l)), 0);

  const settings = JSON.parse(fs.readFileSync(path.join(vsDir, "settings.json"), "utf8"));
  assert.equal(settings["files.eol"], "\n");
  const mcp = JSON.parse(fs.readFileSync(path.join(cpDir, "mcp-config.json"), "utf8"));
  assert.ok(mcp.mcpServers.memory);

  // Idempotenz: zweiter Lauf ändert nichts
  const before = fs.readFileSync(path.join(vsDir, "settings.json"), "utf8");
  run(argv, () => {});
  assert.equal(fs.readFileSync(path.join(vsDir, "settings.json"), "utf8"), before);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("run ohne --profile gibt Usage und Exit-Code 2", () => {
  const lines = [];
  assert.equal(run(["node", "bootstrap.mjs"], (l) => lines.push(l)), 2);
  assert.match(lines[0], /Usage/);
});
