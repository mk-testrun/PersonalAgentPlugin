#!/usr/bin/env bash
# preToolUse: secret-scan (block) + tool-guardian (block) + git-guardrails (block)
# JSON wird mit node geparst (Node ist Projekt-Voraussetzung; python3 ist es nicht).
set -euo pipefail
INPUT=$(cat)

# --- JSON-Felder via node extrahieren (fail-open bei Parse-Fehler, wie zuvor) ---
extract() {
  printf '%s' "$INPUT" | node -e '
    let s = "";
    process.stdin.on("data", d => s += d).on("end", () => {
      let d = {};
      try { d = JSON.parse(s); } catch {}
      const field = process.argv[1];
      if (field === "name") process.stdout.write(String(d.toolName || d.tool_name || ""));
      else process.stdout.write(JSON.stringify(d.toolArgs || d.tool_args || ""));
    });
  ' "$1" 2>/dev/null || printf ''
}
TOOL_NAME=$(extract name)
TOOL_ARGS=$(extract args)

# Secret-scan: offensichtliche Credential-Muster in Argumenten (block)
if printf '%s' "$TOOL_ARGS" | grep -qiE '(password|secret|token|api[_-]?key|pat)[[:space:]]*[=:][[:space:]]*[A-Za-z0-9+/]{20,}'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: potential credential detected in tool arguments"}'
  exit 0
fi

# Tool-guardian deny list (block)
DENY_PATTERNS=("rm -rf" "curl http://" "wget http://" "Invoke-WebRequest")
for pattern in "${DENY_PATTERNS[@]}"; do
  if printf '%s' "$TOOL_ARGS" | grep -qF "$pattern"; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: blocked command pattern: '"$pattern"'"}'
    exit 0
  fi
done

# Git-Guardrails (policy/git-guardrails.json)
# Force-push auf protected branches — immer block
if printf '%s' "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)'; then
  if printf '%s' "$TOOL_ARGS" | grep -qE '(main|master|develop|release/)'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: force-push auf protected branch verboten"}'
    exit 0
  fi
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: git push --force ohne --force-with-lease blockiert"}'
  exit 0
fi
# Weitere gefährliche Git-Operationen — block
GIT_DENY=("git reset --hard" "git clean -fd" "git clean -fdx" "git branch -D" "git checkout -f" "git switch -f" "git update-ref -d" "git reflog delete" "git filter-branch" "git filter-repo")
for pattern in "${GIT_DENY[@]}"; do
  if printf '%s' "$TOOL_ARGS" | grep -qF "$pattern"; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: '"$pattern"' blockiert"}'
    exit 0
  fi
done
# git rebase auf shared branches
if printf '%s' "$TOOL_ARGS" | grep -qE 'git rebase.*(main|master|develop)'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: git rebase auf shared branch blockiert"}'
  exit 0
fi

echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
