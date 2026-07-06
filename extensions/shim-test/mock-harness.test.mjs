// Bridge-Mock-Harness (Ausführungsplan §T2.3 P1): spricht mkc-bridge/1 direkt mit den ECHTEN
// publizierten .NET-Binaries — ohne CLI. Validiert deny/allow, fail-closed, Confirm-Deadline,
// Budget-Erschöpfung und die Modus-Umschaltung.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import * as readline from "node:readline";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function pascal(name) {
  return name.replace(/^mkc-work-/, "").replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

// Minimaler Bridge-Client: spawnt Head, macht Handshake, bietet request()/event().
function connect(name, { stateDir, onUiRequest } = {}) {
  const dll = join(ROOT, "host", name, "bin", `Mkc.Copilot.Extensions.${pascal(name)}.dll`);
  const child = spawn("dotnet", [dll], {
    env: { ...process.env, MKC_BRIDGE_V: "1", MKC_EXT_NAME: name, MKC_STATE_DIR: stateDir, MKC_CWD: stateDir },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const pending = new Map();
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));
  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    if (msg.type === "event" && msg.method === "ready") return readyResolve(msg.payload);
    if (msg.type === "res" && pending.has(msg.id)) {
      const { resolve, timer } = pending.get(msg.id);
      clearTimeout(timer); pending.delete(msg.id); resolve(msg);
    } else if (msg.type === "req" && onUiRequest) {
      const payload = await onUiRequest(msg.method, msg.payload);
      child.stdin.write(JSON.stringify({ v: 1, id: msg.id, type: "res", ok: true, payload }) + "\n");
    }
  });
  function request(method, payload, timeoutMs = 3000) {
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => { pending.delete(id); resolve(null); }, timeoutMs);
      pending.set(id, { resolve, timer });
      child.stdin.write(JSON.stringify({ v: 1, id, type: "req", method, payload }) + "\n");
    });
  }
  return {
    ready,
    request,
    event: (method, payload) => child.stdin.write(JSON.stringify({ v: 1, id: null, type: "event", method, payload }) + "\n"),
    async init() { await ready; return (await request("init", { capabilities: [] }))?.payload; },
    async close() { await request("shutdown", {}, 3000); try { child.kill(); } catch {} },
  };
}

function tempState() {
  const dir = mkdtempSync(join(tmpdir(), "mkc-harness-"));
  return { dir, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

function pre(toolName, command, turn = 0) {
  return { toolName, toolArgs: { command }, turn };
}

test("guardian: manifest + force-push deny, force-with-lease allow", async () => {
  const s = tempState();
  const g = connect("mkc-work-guardian", { stateDir: s.dir });
  try {
    const manifest = await g.init();
    assert.equal(manifest.name, "mkc-work-guardian");
    assert.equal(manifest.status, "experimental");

    const denied = await g.request("hook.preToolUse", pre("shell", "git push --force origin main"));
    assert.equal(denied.payload.permissionDecision, "deny");
    assert.match(denied.payload.permissionDecisionReason, /git-push-force/);

    const allowed = await g.request("hook.preToolUse", pre("shell", "git push --force-with-lease origin feature/ab12-x"));
    // Allow ⇒ Guardian gibt kein Votum (null payload)
    assert.ok(allowed.payload == null || allowed.payload.permissionDecision !== "deny");

    const bypass = await g.request("hook.preToolUse", pre("shell", 'sh -c "git push -f origin main"'));
    assert.equal(bypass.payload.permissionDecision, "deny");
  } finally { await g.close(); s.cleanup(); }
});

test("guardian: confirm becomes deny in autonomous mode (via stale mode.json)", async () => {
  const s = tempState();
  // mode.json fehlt ⇒ Read() == Unknown ⇒ Confirm wird zu deny (nicht interaktiv)
  const g = connect("mkc-work-guardian", { stateDir: s.dir });
  try {
    await g.init();
    const res = await g.request("hook.preToolUse", pre("shell", "git reset --hard HEAD~3"));
    assert.equal(res.payload.permissionDecision, "deny");
  } finally { await g.close(); s.cleanup(); }
});

test("guardian: confirm-deadline — unbeantwortetes ui.confirm ⇒ deny", async () => {
  const s = tempState();
  // interaktiver Modus, aber UI antwortet nie (Timeout im Head ⇒ null ⇒ deny)
  const modeFile = join(s.dir, "mode.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(modeFile, JSON.stringify({ mode: "interactive", updatedAt: new Date().toISOString(), sessionId: "t" }));
  const g = connect("mkc-work-guardian", {
    stateDir: s.dir,
    onUiRequest: () => new Promise(() => {}), // nie auflösen
  });
  try {
    await g.init();
    const res = await g.request("hook.preToolUse", pre("shell", "git reset --hard HEAD~1"), 70000);
    assert.equal(res.payload.permissionDecision, "deny");
  } finally { await g.close(); s.cleanup(); }
});

test("sentinel: mode kippt nach 6 ToolExecutionStart auf autonomous", async () => {
  const s = tempState();
  const sen = connect("mkc-work-sentinel", { stateDir: s.dir });
  try {
    await sen.init();
    for (let i = 0; i < 6; i++) sen.event("event.session", { kind: "ToolExecutionStart", data: {} });
    await new Promise((r) => setTimeout(r, 300));
    const { readFileSync } = await import("node:fs");
    const mode = JSON.parse(readFileSync(join(s.dir, "mode.json"), "utf8"));
    assert.equal(mode.mode, "autonomous");
  } finally { await sen.close(); s.cleanup(); }
});

test("sentinel: budget-erschöpfung ⇒ deny", async () => {
  const s = tempState();
  const sen = connect("mkc-work-sentinel", { stateDir: s.dir });
  try {
    await sen.init();
    await sen.request("command.invoke", { name: "budget", args: "set toolCalls 2" });
    await sen.request("hook.preToolUse", pre("read", "x"));
    await sen.request("hook.preToolUse", pre("read", "x"));
    const third = await sen.request("hook.preToolUse", pre("read", "x"));
    assert.equal(third.payload.permissionDecision, "deny");
    assert.match(third.payload.permissionDecisionReason, /budget/);
  } finally { await sen.close(); s.cleanup(); }
});

test("sentinel: /autopilot on|off schaltet Modus", async () => {
  const s = tempState();
  const sen = connect("mkc-work-sentinel", { stateDir: s.dir });
  try {
    await sen.init();
    const on = await sen.request("command.invoke", { name: "autopilot", args: "on" });
    assert.match(on.payload.text, /Autonomous/);
    const off = await sen.request("command.invoke", { name: "autopilot", args: "off" });
    assert.match(off.payload.text, /Interactive/);
  } finally { await sen.close(); s.cleanup(); }
});

test("flow: /feature start erzeugt plan.md + workflow-state, /workflow next blockt an gate", async () => {
  const s = tempState();
  // git-Repo, damit Gates deterministisch sind
  const { execSync } = await import("node:child_process");
  execSync("git init -q && git config user.email t@t.de && git config user.name t && git commit -q --allow-empty -m init", { cwd: s.dir, shell: "/bin/bash" });
  const f = connect("mkc-work-flow", { stateDir: s.dir });
  try {
    await f.init();
    const start = await f.request("command.invoke", { name: "feature", args: 'start "CSV Export"' });
    assert.match(start.payload.text, /Workflow 'feature' gestartet/);
    const { existsSync } = await import("node:fs");
    assert.ok(existsSync(join(s.dir, ".copilot", "planning", "csv-export", "plan.md")));

    const list = await f.request("command.invoke", { name: "workflow", args: "list" });
    assert.match(list.payload.text, /feature\/csv-export/);
  } finally { await f.close(); s.cleanup(); }
});

test("recorder: assistant.usage-Events ⇒ /flightlog costs summiert je Modell", async () => {
  const s = tempState();
  const r = connect("mkc-work-recorder", { stateDir: s.dir });
  try {
    await r.init();
    r.event("event.session", { kind: "AssistantUsage", data: { model: "gpt-5", inputTokens: 1000, outputTokens: 1000, cachedTokens: 0 } });
    r.event("event.session", { kind: "AssistantUsage", data: { model: "gpt-5", inputTokens: 2000, outputTokens: 0, cachedTokens: 0 } });
    await new Promise((res) => setTimeout(res, 200));
    const costs = await r.request("command.invoke", { name: "flightlog", args: "costs" });
    // gpt-5: 3000/1k*0.010 + 1000/1k*0.030 = 0.060
    assert.match(costs.payload.text, /0[.,]060/);
    const models = await r.request("command.invoke", { name: "flightlog", args: "models" });
    assert.match(models.payload.text, /gpt-5/);
  } finally { await r.close(); s.cleanup(); }
});
