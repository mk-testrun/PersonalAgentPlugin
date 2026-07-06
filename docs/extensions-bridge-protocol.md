# mkc-bridge/1 — Protokoll-Spezifikation

> Kanonische Spec der Ebene **Stecker (extension.mjs) ↔ .NET-Head**. Die andere Ebene
> (CLI ↔ Stecker) ist JSON-RPC der CLI und wird vollständig durch `joinSession()` gekapselt.
> Referenz-Implementierung: `extensions/host/lib/bridge.mjs` (JS) und
> `extensions/src/Mkc.Copilot.Extensions.Core/Bridge/` (C#).

## Transport
- **NDJSON**: ein JSON-Objekt pro Zeile, UTF-8, `\n`-terminiert, über stdin/stdout.
- **stderr** ist ausschließlich für Logs.
- Voll-duplex, `id`-korreliert. Bewusst **kein** JSON-RPC 2.0 (kein Batch/Notification/`error.data`).

## Envelope
```json
{ "v": 1, "id": "<uuid | null bei event>", "type": "req|res|event", "method": "<ns.name>", "payload": { } }
```
Antwort: `{ "v":1, "id":"…", "type":"res", "ok":true, "payload":{…} }`
bzw. `{ "v":1, "id":"…", "type":"res", "ok":false, "error":{ "code","message" } }`.

## ENV beim Spawn
`MKC_BRIDGE_V=1`, `MKC_EXT_NAME`, `MKC_STATE_DIR` (= `<cwd>/.copilot/state/extensions/mkc/`),
`MKC_SESSION_ID`, `MKC_CWD`. Optional: `MKC_EXT_BIN` (Binary-Override), `MKC_NO_SHADOW=1`
(Shadow-Copy aus).

## Handshake
1. Shim spawnt Child.
2. Child → `event ready {name, version, protocol:1}` (Timeout 10 000 ms).
3. Shim → `req init {sessionId, cwd, cliVersion, capabilities[]}`.
4. Child → `res` mit **RegistrationManifest**:
   `{status:"experimental", hooks[], tools[{name,description,inputSchema,skipPermission?,defer?}],
   commands[{name,description}], systemMessage{mode:"append",sections[{name,text}]}?,
   wantsPermissionFlow, wantsSessionEvents[]}`.
5. Shim registriert exakt das bei `joinSession` und leitet fortan alle Aufrufe weiter.

## Shim → Child (`req`) mit Timeouts (Timeout ⇒ Request im Child cancelt)
| method | payload | response | Timeout |
|---|---|---|---|
| `hook.preToolUse` | `{toolName, toolArgs, turn}` | `{permissionDecision?, permissionDecisionReason?, modifiedArgs?, additionalContext?}` | 2000 ms |
| `hook.postToolUse` / `hook.postToolUseFailure` | `{toolName, toolArgs, result|error, durationMs}` | `{additionalContext?}` | 2000 ms |
| `hook.userPromptSubmitted` | `{prompt}` | `{modifiedPrompt?, additionalContext?}` | 1500 ms |
| `hook.sessionStart` | `{resumed}` | `{additionalContext?}` | 3000 ms |
| `hook.sessionEnd` | `{reason}` | `{}` | 3000 ms |
| `hook.errorOccurred` | `{error, attempt}` | `{action:"retry"|"skip"|"abort"}` | 1500 ms |
| `permission.request` | `{request}` | `{decision:"allow"|"deny"|"pass", reason?}` | 2000 ms |
| `tool.invoke` | `{name, args, invocationId}` | `{result, isError?}` | 60 000 ms |
| `command.invoke` | `{name, args}` | `{text}` | 60 000 ms |
| `init` | `{sessionId, cwd, cliVersion, capabilities[]}` | RegistrationManifest | 5000 ms |
| `shutdown` | `{}` | `{}`; Child cancelt Ops, flusht, exit 0; Kill nach 3 s | 3000 ms |

## Shim → Child (`event`, fire-and-forget)
`event.session {kind, data}` mit
`kind ∈ {UserMessage, AssistantMessage(Delta), AssistantUsage, ToolExecutionStart,
ToolExecutionComplete, SessionIdle, Compaction, SubagentStarted/Completed/Failed, …}` —
nur die per `wantsSessionEvents` abonnierten.

## Child → Shim (`req`, verschachtelt erlaubt)
`ui.confirm {title,message,timeoutMs?}` → `{confirmed, timedOut?}` ·
`ui.select {message,options[],timeoutMs?}` → `{choice, timedOut?}` ·
`ui.input {message,timeoutMs?}` → `{value, timedOut?}`.
Nicht beantwortete Dialoge meldet der Shim nach `timeoutMs` als `timedOut:true` zurück
(Grundlage der Confirm-Deadline: 60 000 ms ⇒ Deny).

## Fail-Policy (im Shim, pro Extension)
- Kaputte Zeile ⇒ stderr + ignorieren.
- Child-Crash ⇒ 1 Restart mit Backoff; danach `failMode:"closed"` (guardian, sentinel) ⇒ Shim
  antwortet `preToolUse`/`permission.request` selbst mit `deny`; `failMode:"open"`
  (flow, recorder) ⇒ Hooks werden No-Ops.
- Timeout einer Guardian-/Sentinel-`preToolUse` ⇒ `deny`.
- Payload-Normalisierung: `toolName`/`tool_name`/`name`, `toolArgs`/`arguments`/`args`.

## Versionierung
Protokoll-Version in drei Quellen konsistent halten (Validator prüft das Triple):
`extensions/versions.json` (`bridgeProtocol`), `host/lib/bridge.mjs`,
`Bridge/BridgeMessage.cs` (`BridgeProtocol.Version`).
