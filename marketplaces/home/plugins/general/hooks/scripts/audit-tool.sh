#!/usr/bin/env bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('toolName','unknown'))" 2>/dev/null || echo "unknown")
AUDIT_FILE=".copilot/state/audit.jsonl"
mkdir -p "$(dirname "$AUDIT_FILE")"
echo "{\"event\":\"postToolUse\",\"tool\":\"$TOOL_NAME\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$AUDIT_FILE"
