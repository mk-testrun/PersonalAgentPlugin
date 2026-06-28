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

# Git-Guardrails (§2.10 — policy/git-guardrails.json, source: mattpocock/skills)
# Force-push auf protected branches — immer block
if echo "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)'; then
  if echo "$TOOL_ARGS" | grep -qE '(main|master|develop|release/)'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: force-push auf protected branch verboten"}'
    exit 0
  fi
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: git push --force ohne --force-with-lease blockiert (Work)"}'
  exit 0
fi
# Weitere gefährliche Git-Operationen — block in Work-Modus
GIT_DENY=("git reset --hard" "git clean -fd" "git clean -fdx" "git branch -D" "git checkout -f" "git switch -f" "git update-ref -d" "git reflog delete" "git filter-branch" "git filter-repo")
for pattern in "${GIT_DENY[@]}"; do
  if echo "$TOOL_ARGS" | grep -qF "$pattern"; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: '"$pattern"' ist in Work blockiert"}'
    exit 0
  fi
done
# git rebase auf shared branches
if echo "$TOOL_ARGS" | grep -qE 'git rebase.*(main|master|develop)'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: git rebase auf shared branch blockiert (Work)"}'
  exit 0
fi

echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
