// Shim-Regressionstest: fährt host/lib/bridge.mjs::startBridge mit einem Fake-joinSession,
// der die REALE @github/copilot-sdk-Oberfläche nachbildet (CLI 1.0.68, SDK-Protokoll 3):
// hooks.onXxx, commands mit void-Handler + session.log, tools mit `parameters`, session.on(handler),
// session.ui.confirm. Deckt die Lücke, die der Mock-Harness (direkt gegen die .NET-Binaries) nicht
// abdeckt: den Node-Wrapper + die Übersetzung reale API ⇄ mkc-bridge.

import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const { startBridge } = await import(pathToFileURL(join(ROOT, "host", "lib", "bridge.mjs")).href);

// Fake-Session, die die reale SDK-Oberfläche nachbildet.
function fakeJoinSession() {
  let captured;
  const logs = [];
  let eventHandler = null;
  const session = {
    ui: { confirm: async () => true, select: async () => null, input: async () => null },
    log: async (text) => { logs.push(text); },
    on: (handler) => { eventHandler = handler; return () => {}; },
  };
  const join = async (options) => { captured = options; return session; };
  return {
    join,
    get options() { return captured; },
    get logs() { return logs; },
    emit(evt) { eventHandler?.(evt); },
  };
}

function tempCwd() {
  const dir = mkdtempSync(join(tmpdir(), "mkc-shim-"));
  return { dir, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

async function withCwd(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try { return await fn(); } finally { process.chdir(prev); }
}

function extUrl(name) {
  return pathToFileURL(join(ROOT, "host", name, "extension.mjs")).href;
}

test("shim: registriert Hooks unter den REALEN onXxx-Namen", async () => {
  const s = tempCwd();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const bridge = await startBridge(fake.join, { name: "mkc-work-guardian", failMode: "closed", extensionUrl: extUrl("mkc-work-guardian") });
    try {
      const hooks = fake.options.hooks;
      assert.ok(typeof hooks.onPreToolUse === "function", "onPreToolUse muss registriert sein");
      assert.ok(!("preToolUse" in hooks), "alter Name preToolUse darf NICHT verwendet werden");
    } finally { await bridge.dispose(); }
  });
});

test("shim: ALLOW bleibt allow, DENY kommt durch (onPreToolUse)", async () => {
  const s = tempCwd();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const bridge = await startBridge(fake.join, { name: "mkc-work-guardian", failMode: "closed", extensionUrl: extUrl("mkc-work-guardian") });
    try {
      const hook = fake.options.hooks.onPreToolUse;
      const allow = await hook({ toolName: "shell", toolArgs: { command: "git status" }, workingDirectory: s.dir });
      assert.notEqual(allow?.permissionDecision, "deny");
      const deny = await hook({ toolName: "shell", toolArgs: { command: "git push --force origin main" }, workingDirectory: s.dir });
      assert.equal(deny.permissionDecision, "deny");
    } finally { await bridge.dispose(); }
  });
});

test("shim: Command-Ausgabe läuft über session.log (Handler gibt void)", async () => {
  const s = tempCwd();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const bridge = await startBridge(fake.join, { name: "mkc-work-guardian", failMode: "closed", extensionUrl: extUrl("mkc-work-guardian") });
    try {
      const cmd = fake.options.commands.find((c) => c.name === "guardian");
      assert.ok(cmd, "guardian-Command registriert");
      const ret = await cmd.handler({ sessionId: "t", command: "/guardian status", commandName: "guardian", args: "status" });
      assert.equal(ret, undefined, "Handler muss void zurückgeben");
      assert.ok(fake.logs.some((l) => /mkc-work-guardian aktiv/.test(l)), "Ausgabe muss via session.log erfolgen");
    } finally { await bridge.dispose(); }
  });
});

test("shim: Tools tragen `parameters` (nicht inputSchema)", async () => {
  const s = tempCwd();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const bridge = await startBridge(fake.join, { name: "mkc-work-flow", failMode: "open", extensionUrl: extUrl("mkc-work-flow") });
    try {
      const tools = fake.options.tools;
      assert.ok(tools.length >= 1);
      for (const t of tools) {
        assert.ok("parameters" in t, `Tool ${t.name} muss parameters haben`);
        assert.ok(!("inputSchema" in t));
      }
    } finally { await bridge.dispose(); }
  });
});

test("shim: reale assistant.usage-Events werden gemappt und vom Recorder verrechnet", async () => {
  const s = tempCwd();
  await withCwd(s.dir, async () => {
    const fake = fakeJoinSession();
    const bridge = await startBridge(fake.join, { name: "mkc-work-recorder", failMode: "open", extensionUrl: extUrl("mkc-work-recorder") });
    try {
      // Reales Event-Format der CLI (assistant.usage mit cacheRead/Write + cost).
      fake.emit({ type: "assistant.usage", data: { model: "gpt-5", inputTokens: 1000, outputTokens: 1000, cacheReadTokens: 500, cacheWriteTokens: 0, cost: 0.042 } });
      await new Promise((r) => setTimeout(r, 250));
      const cmd = fake.options.commands.find((c) => c.name === "flightlog");
      await cmd.handler({ sessionId: "t", command: "/flightlog costs", commandName: "flightlog", args: "costs" });
      await new Promise((r) => setTimeout(r, 150));
      // Reale cost (0.042) wird bevorzugt gegenüber PriceTable.
      assert.ok(fake.logs.some((l) => /0[.,]042/.test(l)), "reale cost muss im costs-Report erscheinen; logs=" + JSON.stringify(fake.logs));
    } finally { await bridge.dispose(); }
  });
});
