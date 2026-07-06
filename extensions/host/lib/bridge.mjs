// mkc-bridge/1 — einzige Shim-Logik (Ausführungsplan §3, §1.4).
// Spawnt den .NET-Head, sprecht NDJSON über stdio, registriert dessen Manifest bei joinSession,
// leitet Hooks/Commands/Events durch und beantwortet ui.*-Gegenrequests.
// Fail-Policy: closed ⇒ selbst `deny`; open ⇒ No-Op. Shadow-Copy gegen DLL-Locks (Windows/Hot-Reload).

import { spawn } from "node:child_process";
import { mkdtempSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import * as readline from "node:readline";

const TIMEOUTS = {
  "hook.preToolUse": 2000, "hook.postToolUse": 2000, "hook.postToolUseFailure": 2000,
  "permission.request": 2000, "hook.userPromptSubmitted": 1500, "hook.errorOccurred": 1500,
  "hook.sessionStart": 3000, "hook.sessionEnd": 3000, "shutdown": 3000,
  "tool.invoke": 60000, "command.invoke": 60000,
};
const READY_TIMEOUT = 10000;

function pascal(name) {
  return name.replace(/^mkc-work-/, "").replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function shadowCopy(binDir) {
  if (process.env.MKC_NO_SHADOW === "1" || !existsSync(binDir)) return binDir;
  try {
    const shadow = mkdtempSync(join(tmpdir(), "mkc-bin-"));
    cpSync(binDir, shadow, { recursive: true });
    return shadow;
  } catch {
    return binDir; // Shadow-Copy fehlgeschlagen ⇒ direkt aus bin/ (Unix ok)
  }
}

// Startet den Child-Prozess und liefert eine RPC-Fassade (req/res-Korrelation, events).
function startChild(name, extRoot) {
  const binDir = shadowCopy(join(extRoot, "bin"));
  const dll = join(binDir, `Mkc.Copilot.Extensions.${pascal(name)}.dll`);
  const entry = process.env.MKC_EXT_BIN || dll;
  const child = spawn("dotnet", [entry], {
    env: {
      ...process.env, MKC_BRIDGE_V: "1", MKC_EXT_NAME: name,
      MKC_STATE_DIR: join(process.cwd(), ".copilot", "state", "extensions", "mkc"),
      MKC_CWD: process.cwd(),
    },
    stdio: ["pipe", "pipe", "inherit"],
  });

  const pending = new Map();          // id → {resolve, timer}
  const eventHandlers = new Map();     // method → async fn (Child→Shim requests)
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));

  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { process.stderr.write(`[bridge] kaputte Zeile\n`); return; }
    if (msg.type === "event" && msg.method === "ready") { readyResolve(msg.payload); return; }
    if (msg.type === "res" && pending.has(msg.id)) {
      const { resolve, timer } = pending.get(msg.id);
      clearTimeout(timer); pending.delete(msg.id); resolve(msg);
      return;
    }
    if (msg.type === "req" && eventHandlers.has(msg.method)) {
      const result = await eventHandlers.get(msg.method)(msg.payload);
      send({ v: 1, id: msg.id, type: "res", ok: true, payload: result });
    }
  });

  function send(obj) {
    if (child.stdin.writable) child.stdin.write(JSON.stringify(obj) + "\n");
  }

  function request(method, payload, timeoutMs) {
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => { pending.delete(id); resolve(null); }, timeoutMs ?? TIMEOUTS[method] ?? 5000);
      pending.set(id, { resolve, timer });
      send({ v: 1, id, type: "req", method, payload });
    });
  }

  return {
    child, ready,
    onRequest: (method, fn) => eventHandlers.set(method, fn),
    request,
    event: (method, payload) => send({ v: 1, id: null, type: "event", method, payload }),
    async handshake() {
      const identity = await Promise.race([
        ready,
        new Promise((_, rej) => setTimeout(() => rej(new Error("ready timeout")), READY_TIMEOUT)),
      ]);
      const res = await request("init", {
        sessionId: process.env.MKC_SESSION_ID ?? null, cwd: process.cwd(),
        cliVersion: process.env.COPILOT_CLI_VERSION ?? null, capabilities: [],
      }, 5000);
      return { identity, manifest: res?.payload };
    },
    shutdown() {
      return new Promise((resolve) => {
        const done = () => resolve();
        request("shutdown", {}, 3000).then(done);
        setTimeout(() => { try { child.kill(); } catch {} done(); }, 3000);
      });
    },
  };
}

// Normalisiert Tool-Payload-Varianten (toolName/tool_name, toolArgs/arguments).
function normPre(input) {
  return {
    toolName: input.toolName ?? input.tool_name ?? input.name ?? "",
    toolArgs: input.toolArgs ?? input.arguments ?? input.args ?? {},
    turn: input.turn ?? input.turnNumber ?? 0,
  };
}

export async function startBridge(joinSession, { name, failMode }) {
  const extRoot = fileURLToPath(new URL("./", import.meta.url));
  let rpc = startChild(name, extRoot);
  let restarts = 0;

  async function callHook(method, payload) {
    if (!rpc.child.stdin.writable && restarts < 1) { restarts++; rpc = startChild(name, extRoot); await rpc.handshake(); }
    const res = await rpc.request(method, payload);
    if (res && res.ok) return res.payload;
    return null;
  }

  const failClosedDeny = { permissionDecision: "deny", permissionDecisionReason: `${name} offline — fail-closed` };

  let manifest;
  try { ({ manifest } = await rpc.handshake()); }
  catch (e) { process.stderr.write(`[bridge] ${name} handshake fehlgeschlagen: ${e.message}\n`); manifest = null; }

  const hooks = {};
  const wants = new Set(manifest?.hooks ?? []);

  if (wants.has("preToolUse"))
    hooks.preToolUse = async (input) => {
      const r = await callHook("hook.preToolUse", normPre(input));
      return r ?? (failMode === "closed" ? failClosedDeny : {});
    };
  if (wants.has("postToolUse"))
    hooks.postToolUse = async (input) => (await callHook("hook.postToolUse", input)) ?? {};
  if (wants.has("userPromptSubmitted"))
    hooks.userPromptSubmitted = async (input) => (await callHook("hook.userPromptSubmitted", input)) ?? {};
  if (wants.has("sessionStart"))
    hooks.sessionStart = async (input) => (await callHook("hook.sessionStart", { resumed: !!input?.resumed })) ?? {};
  if (wants.has("sessionEnd"))
    hooks.sessionEnd = async (input) => (await callHook("hook.sessionEnd", input)) ?? {};
  if (wants.has("errorOccurred"))
    hooks.errorOccurred = async (input) => (await callHook("hook.errorOccurred", input)) ?? { action: "skip" };

  const commands = (manifest?.commands ?? []).map((c) => ({
    name: c.name, description: c.description,
    handler: async (ctx) => {
      const res = await rpc.request("command.invoke", { name: c.name, args: ctx?.args ?? "" });
      return res?.payload?.text ?? "";
    },
  }));

  const tools = (manifest?.tools ?? []).map((t) => ({
    name: t.name, description: t.description, inputSchema: t.inputSchema,
    skipPermission: t.skipPermission ?? false, defer: t.defer ?? false,
    handler: async (args, inv) => {
      const res = await rpc.request("tool.invoke", { name: t.name, args, invocationId: inv?.invocationId ?? "" });
      return res?.payload?.result ?? null;
    },
  }));

  // ui.*-Gegenrequests des Childs auf session.ui.* abbilden.
  rpc.onRequest("ui.confirm", async (p) => {
    if (!session.ui?.confirm) return { confirmed: false, timedOut: true };
    const confirmed = await session.ui.confirm(p.message ?? p.title ?? "?");
    return { confirmed: !!confirmed };
  });
  rpc.onRequest("ui.select", async (p) => ({ choice: session.ui?.select ? await session.ui.select(p.message, p.options) : null }));
  rpc.onRequest("ui.input", async (p) => ({ value: session.ui?.input ? await session.ui.input(p.message) : null }));

  const wantsEvents = new Set(manifest?.wantsSessionEvents ?? []);
  const session = await joinSession({
    hooks, tools, commands,
    ...(manifest?.systemMessage ? { systemMessage: manifest.systemMessage } : {}),
    onPermissionRequest: manifest?.wantsPermissionFlow
      ? async (request) => {
          const res = await rpc.request("permission.request", { request });
          const decision = res?.payload?.decision ?? "pass";
          return decision === "deny" ? { decision: "deny", reason: res?.payload?.reason }
               : decision === "allow" ? { decision: "allow" } : undefined;
        }
      : undefined,
  });

  // Abonnierte Session-Events an den Child weiterreichen.
  if (session.on && wantsEvents.size > 0)
    session.on("*", (evt) => {
      const kind = evt?.type ?? evt?.kind;
      if (kind && wantsEvents.has(kind)) rpc.event("event.session", { kind, data: evt });
    });

  return { dispose: () => rpc.shutdown() };
}
