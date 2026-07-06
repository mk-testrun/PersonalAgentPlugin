// Shim-Regressionstest: fährt host/lib/bridge.mjs::startBridge mit einem Fake-joinSession
// gegen das ECHTE Guardian-Binary. Deckt genau die Lücke, die der Mock-Harness (der die
// Binaries direkt anspricht) nicht abdeckt: den Node-Wrapper mit Fail-Policy + Binary-Auflösung.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const { startBridge } = await import(pathToFileURL(join(ROOT, "host", "lib", "bridge.mjs")).href);

// Fake-joinSession: fängt die registrierten Optionen ab, damit wir hooks.preToolUse
// direkt aufrufen können (so, wie es die CLI täte).
function fakeJoinSession() {
  let captured;
  const join = async (options) => {
    captured = options;
    return { ui: {}, on: () => {} };
  };
  return { join, get options() { return captured; } };
}

function tempState() {
  const dir = mkdtempSync(join(tmpdir(), "mkc-shim-"));
  return { dir, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

// startBridge nutzt process.cwd() für MKC_STATE_DIR — im isolierten Temp-cwd ausführen.
async function withCwd(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try { return await fn(); } finally { process.chdir(prev); }
}

test("shim: ALLOW (kein Votum) wird NICHT zu fail-closed-Deny", async () => {
  const s = tempState();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    // extensionUrl zeigt auf host/mkc-work-guardian/extension.mjs ⇒ bin/ dort wird gefunden.
    const extUrl = pathToFileURL(join(ROOT, "host", "mkc-work-guardian", "extension.mjs")).href;
    const bridge = await startBridge(fake.join, { name: "mkc-work-guardian", failMode: "closed", extensionUrl: extUrl });
    try {
      const hook = fake.options.hooks.preToolUse;
      // Harmloses Kommando ⇒ Guardian stimmt mit "kein Votum" ab ⇒ Shim darf NICHT denyen.
      const res = await hook({ toolName: "shell", toolArgs: { command: "git status" }, turn: 0 });
      assert.notEqual(res?.permissionDecision, "deny");
      // Gegenprobe: destruktiv ⇒ deny kommt durch.
      const denied = await hook({ toolName: "shell", toolArgs: { command: "git push --force origin main" }, turn: 0 });
      assert.equal(denied.permissionDecision, "deny");
    } finally { await bridge.dispose(); }
  });
});

test("shim: totes Kind ⇒ fail-closed-Deny (nur bei echtem Ausfall)", async () => {
  const s = tempState();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const extUrl = pathToFileURL(join(ROOT, "host", "mkc-work-guardian", "extension.mjs")).href;
    const bridge = await startBridge(fake.join, { name: "mkc-work-guardian", failMode: "closed", extensionUrl: extUrl });
    const hook = fake.options.hooks.preToolUse;
    await bridge.dispose(); // Kind beenden ⇒ Requests laufen ins Leere
    const res = await hook({ toolName: "shell", toolArgs: { command: "git status" }, turn: 0 });
    assert.equal(res.permissionDecision, "deny");
    assert.match(res.permissionDecisionReason, /fail-closed/);
  });
});
