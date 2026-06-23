#!/usr/bin/env bash
# preToolUse: secret-scan (block) + tool-guardian (block) + vuln-scan (warn)
set -euo pipefail
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('toolName') or d.get('tool_name',''))" 2>/dev/null || echo "")
TOOL_ARGS=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('toolArgs') or d.get('tool_args','')))" 2>/dev/null || echo '""')

# Secret-scan: look for obvious secret patterns in args (block)
if echo "$TOOL_ARGS" | grep -qiE '(password|secret|token|api[_-]?key|pat)\s*[=:]\s*[A-Za-z0-9+/]{20,}'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: potential credential detected in tool arguments"}'
  exit 0
fi

# Tool-guardian deny list (block)
DENY_PATTERNS=("rm -rf" "curl http://" "wget http://" "Invoke-WebRequest")
for pattern in "${DENY_PATTERNS[@]}"; do
  if echo "$TOOL_ARGS" | grep -qF "$pattern"; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: blocked command pattern: '"$pattern"'"}'
    exit 0
  fi
done

echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
