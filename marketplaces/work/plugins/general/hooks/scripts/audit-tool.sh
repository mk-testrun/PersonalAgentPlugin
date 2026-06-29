#!/usr/bin/env bash
# postToolUse: audit-Eintrag. JSON via node (Node ist Projekt-Voraussetzung).
INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    let d = {};
    try { d = JSON.parse(s); } catch {}
    process.stdout.write(String(d.toolName || d.tool_name || "unknown"));
  });
' 2>/dev/null || printf 'unknown')
AUDIT_FILE=".copilot/state/audit.jsonl"
mkdir -p "$(dirname "$AUDIT_FILE")"
echo "{\"event\":\"postToolUse\",\"tool\":\"$TOOL_NAME\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$AUDIT_FILE"
