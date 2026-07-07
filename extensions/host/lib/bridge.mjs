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

export async function startBridge(joinSession, { name, failMode, extensionUrl }) {
  // extRoot ist das host/<name>/-Verzeichnis (dort liegt bin/). Es MUSS aus der
  // extension.mjs stammen (extensionUrl), nicht aus lib/bridge.mjs — sonst würde bin/
  // im lib-Ordner gesucht. Fallback auf import.meta.url nur, wenn nicht übergeben.
  const extRoot = fileURLToPath(new URL("./", extensionUrl ?? import.meta.url));
  let rpc = startChild(name, extRoot);
  let restarts = 0;

  // Ergebnis-Diskriminanz: { reached:true, payload } wenn das Kind geantwortet hat
  // (payload kann bewusst null sein = "kein Votum/allow") vs. { reached:false } bei
  // Ausfall/Timeout. Nur reached:false darf fail-closed auslösen.
  async function callHook(method, payload) {
    if (!rpc.child.stdin.writable && restarts < 1) {
      restarts++; rpc = startChild(name, extRoot);
      try { await rpc.handshake(); wireChildRequests(); } catch { /* Ausfall unten */ }
    }
    const res = await rpc.request(method, payload);
    return res && res.ok ? { reached: true, payload: res.payload } : { reached: false };
  }

  const failClosedDeny = { permissionDecision: "deny", permissionDecisionReason: `${name} offline — fail-closed` };

  let manifest;
  try { ({ manifest } = await rpc.handshake()); }
  catch (e) { process.stderr.write(`[bridge] ${name} handshake fehlgeschlagen: ${e.message}\n`); manifest = null; }

  // Reale @github/copilot-sdk-API (CLI 1.0.68, SDK-Protokoll 3): Hooks heißen onXxx,
  // sessionStart liefert `source` (nicht `resumed`), postToolUse hat `toolResult` und
  // Fehler laufen über den separaten onPostToolUseFailure-Hook.
  const hooks = {};
  const wants = new Set(manifest?.hooks ?? []);

  // Kind erreichbar ⇒ dessen Votum (auch null = allow). Ausfall ⇒ Fallback je Hook.
  const orFallback = (r, fallback) => (r.reached ? (r.payload ?? {}) : fallback);

  if (wants.has("preToolUse"))
    hooks.onPreToolUse = async (input) => {
      const r = await callHook("hook.preToolUse", normPre(input));
      return orFallback(r, failMode === "closed" ? failClosedDeny : {});
    };
  if (wants.has("postToolUse")) {
    hooks.onPostToolUse = async (input) =>
      orFallback(await callHook("hook.postToolUse", {
        toolName: input?.toolName, toolArgs: input?.toolArgs, result: input?.toolResult,
      }), {});
    // Fehlerhafte Tool-Läufe kommen NUR über den separaten Failure-Hook (TestsGreen-Marker).
    hooks.onPostToolUseFailure = async (input) =>
      orFallback(await callHook("hook.postToolUse", {
        toolName: input?.toolName, toolArgs: input?.toolArgs, error: input?.error ?? "failure",
      }), {});
  }
  if (wants.has("userPromptSubmitted"))
    hooks.onUserPromptSubmitted = async (input) => orFallback(await callHook("hook.userPromptSubmitted", input), {});
  if (wants.has("sessionStart"))
    hooks.onSessionStart = async (input) =>
      orFallback(await callHook("hook.sessionStart", { resumed: input?.source === "resume" }), {});
  if (wants.has("sessionEnd"))
    hooks.onSessionEnd = async (input) => orFallback(await callHook("hook.sessionEnd", { reason: input?.reason }), {});
  if (wants.has("errorOccurred"))
    hooks.onErrorOccurred = async (input) => orFallback(await callHook("hook.errorOccurred", input), { action: "skip" });

  // Command-Handler geben in der realen API `void` zurück — Ausgabe erfolgt über session.log().
  const commands = (manifest?.commands ?? []).map((c) => ({
    name: c.name, description: c.description,
    handler: async (ctx) => {
      const res = await rpc.request("command.invoke", { name: c.name, args: ctx?.args ?? "" });
      const text = res?.payload?.text;
      if (text && session?.log) { try { await session.log(text); } catch { process.stderr.write(text + "\n"); } }
    },
  }));

  // Reale Tool-API: { name, description, parameters, handler, skipPermission?, defer? }.
  const tools = (manifest?.tools ?? []).map((t) => ({
    name: t.name, description: t.description, parameters: t.inputSchema,
    ...(t.skipPermission ? { skipPermission: true } : {}),          // z. B. deanonymize_text (rein lokal)
    ...(t.defer ? { defer: "auto" } : {}),                          // lazy laden ⇒ spart Prompt-Tokens
    handler: async (args, inv) => {
      const res = await rpc.request("tool.invoke", { name: t.name, args, invocationId: inv?.toolCallId ?? inv?.invocationId ?? "" });
      return res?.payload?.result ?? null;
    },
  }));

  // ui.*-Gegenrequests des Childs auf session.ui.* abbilden. Als benannte Funktion,
  // damit sie nach einem Child-Restart (callHook) neu verdrahtet werden kann.
  // session.ui.* wirft, wenn der Host keine Elicitation unterstützt ⇒ erst Capability prüfen.
  const uiAvailable = () => session?.capabilities?.ui?.elicitation === true && !!session?.ui;
  function wireChildRequests() {
    rpc.onRequest("ui.confirm", async (p) => {
      if (!uiAvailable()) return { confirmed: false, timedOut: true };
      try { return { confirmed: !!(await session.ui.confirm(p.message ?? p.title ?? "?")) }; }
      catch { return { confirmed: false, timedOut: true }; }
    });
    rpc.onRequest("ui.select", async (p) => {
      if (!uiAvailable()) return { choice: null, timedOut: true };
      try { return { choice: await session.ui.select(p.message, p.options) }; }
      catch { return { choice: null, timedOut: true }; }
    });
    rpc.onRequest("ui.input", async (p) => {
      if (!uiAvailable()) return { value: null, timedOut: true };
      try { return { value: await session.ui.input(p.message) }; }
      catch { return { value: null, timedOut: true }; }
    });
  }
  wireChildRequests();

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

  // Reale Event-Typen → interne Kinds, die die Heads erwarten.
  const EVENT_MAP = {
    "tool.execution_start": "ToolExecutionStart",
    "tool.execution_complete": "ToolExecutionComplete",
    "assistant.usage": "AssistantUsage",
    "assistant.turn_start": "TurnStart",
    "agent_idle": "SessionIdle",
    "auto_mode_switch.completed": "AutoModeSwitch",
    "session.compaction_complete": "Compaction",   // reale Event-Namen (nicht usage_info!)
    "subagent.started": "SubagentStarted",
    "subagent.completed": "SubagentCompleted",
    "subagent.failed": "SubagentFailed",
  };

  // Usage-Felder der realen API auf die interne Form normalisieren
  // (cacheRead+cacheWrite ⇒ cachedTokens; model/cost übernehmen).
  function normalizeEventData(kind, evt) {
    const d = evt?.data ?? {};
    if (kind === "AssistantUsage")
      return {
        model: d.model ?? "unknown",
        inputTokens: d.inputTokens ?? 0,
        outputTokens: d.outputTokens ?? 0,
        cachedTokens: (d.cacheReadTokens ?? 0) + (d.cacheWriteTokens ?? 0),
        cost: d.cost ?? null,
        initiator: d.initiator ?? null,   // identifiziert den (Sub-)Agenten für Fleet-Attribution
      };
    if (kind === "ToolExecutionStart" || kind === "ToolExecutionComplete")
      return { invocationId: d.toolCallId ?? d.toolName ?? "", toolName: d.toolName, success: d.success };
    if (kind === "AutoModeSwitch")
      return { enabled: d.response?.enabled ?? d.enabled ?? null };
    if (kind === "SubagentStarted" || kind === "SubagentCompleted" || kind === "SubagentFailed")
      return { agentName: d.agentName ?? d.agentDisplayName ?? "subagent", agentId: d.agentId ?? null };
    return d;
  }

  // Abonnierte Session-Events an den Child weiterreichen (reale API: session.on(handler)).
  if (session.on && wantsEvents.size > 0)
    session.on((evt) => {
      const kind = EVENT_MAP[evt?.type] ?? null;
      if (kind && wantsEvents.has(kind))
        rpc.event("event.session", { kind, data: normalizeEventData(kind, evt) });
    });

  return { dispose: () => rpc.shutdown() };
}
