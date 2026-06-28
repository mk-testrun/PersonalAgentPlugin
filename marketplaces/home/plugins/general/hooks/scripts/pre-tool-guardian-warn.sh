#!/usr/bin/env bash
# warn-Modus: Denylist-Treffer → allow + Warnung (KEIN deny). Ausnahme: secret-scan bleibt block.
set -euo pipefail
INPUT=$(cat)
TOOL_ARGS=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('toolArgs') or d.get('tool_args','')))" 2>/dev/null || echo '""')

# Secret-scan: BLOCK (auch im Home-Modus)
if echo "$TOOL_ARGS" | grep -qiE '(password|secret|token|api[_-]?key|pat)\s*[=:]\s*[A-Za-z0-9+/]{20,}'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: potential credential detected in tool arguments"}'
  exit 0
fi

# Forkbomb + rm -rf /: BLOCK
if echo "$TOOL_ARGS" | grep -qE ':(){ :|:& };:|rm -rf /'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: destructive system command blocked"}'
  exit 0
fi

# Git-Guardrails §2.10 — Force-Push auf main/master: BLOCK; Rest: WARN
if echo "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)'; then
  if echo "$TOOL_ARGS" | grep -qE '(main|master)'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: force-push auf main/master auch im Home-Modus verboten"}'
    exit 0
  fi
fi

# Alle anderen Denylist-Treffer → WARN (allow + Reason)
WARN=""
if echo "$TOOL_ARGS" | grep -qiE 'curl http://|wget http://'; then
  WARN="Tool-Guardian (warn): unencrypted HTTP detected"
fi
if echo "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)'; then
  WARN="Git-Guardrail (warn): git push --force ohne --force-with-lease"
fi
GIT_WARN=("git reset --hard" "git clean -fd" "git clean -fdx" "git branch -D" "git filter-branch" "git filter-repo")
for pattern in "${GIT_WARN[@]}"; do
  if echo "$TOOL_ARGS" | grep -qF "$pattern"; then
    WARN="Git-Guardrail (warn): $pattern"
    break
  fi
done

if [ -n "$WARN" ]; then
  echo "{\"permissionDecision\":\"allow\",\"permissionDecisionReason\":\"$WARN\"}"
else
  echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
fi
