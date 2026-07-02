#!/usr/bin/env bash
# warn-Modus: Denylist-Treffer → allow + Warnung (KEIN deny). Ausnahme: secret-scan/destruktiv bleiben block.
# JSON via node (Node ist Projekt-Voraussetzung; python3 ist es nicht).
set -euo pipefail
INPUT=$(cat)
TOOL_ARGS=$(printf '%s' "$INPUT" | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    let d = {};
    try { d = JSON.parse(s); } catch {}
    process.stdout.write(JSON.stringify(d.toolArgs || d.tool_args || ""));
  });
' 2>/dev/null || printf '""')

# Secret-scan: BLOCK (auch im warn-Modus)
if printf '%s' "$TOOL_ARGS" | grep -qiE '(password|secret|token|api[_-]?key|pat)[[:space:]]*[=:][[:space:]]*[A-Za-z0-9+/]{20,}'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: potential credential detected in tool arguments"}'
  exit 0
fi

# Forkbomb-Signatur oder rm -rf /: BLOCK
if printf '%s' "$TOOL_ARGS" | grep -qF ':(){' || printf '%s' "$TOOL_ARGS" | grep -qE 'rm -rf /'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: destructive system command blocked"}'
  exit 0
fi

# Force-Push auf main/master: BLOCK (auch im warn-Modus). --force-with-lease ist erlaubt (ADR-0004):
# der sichere Variant clobbert keine fremden Commits, steht nicht auf der Deny-Liste.
if printf '%s' "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)' && ! printf '%s' "$TOOL_ARGS" | grep -q 'force-with-lease'; then
  if printf '%s' "$TOOL_ARGS" | grep -qE '(main|master)'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Git-Guardrail: force-push auf main/master verboten"}'
    exit 0
  fi
fi

# Alle anderen Denylist-Treffer → WARN (allow + Reason)
WARN=""
if printf '%s' "$TOOL_ARGS" | grep -qiE 'curl http://|wget http://'; then
  WARN="Tool-Guardian (warn): unencrypted HTTP detected"
fi
if printf '%s' "$TOOL_ARGS" | grep -qE 'git push.*(--force|-f)' && ! printf '%s' "$TOOL_ARGS" | grep -q 'force-with-lease'; then
  WARN="Git-Guardrail (warn): git push --force ohne --force-with-lease"
fi
GIT_WARN=("git reset --hard" "git clean -fd" "git clean -fdx" "git branch -D" "git filter-branch" "git filter-repo")
for pattern in "${GIT_WARN[@]}"; do
  if printf '%s' "$TOOL_ARGS" | grep -qF "$pattern"; then
    WARN="Git-Guardrail (warn): $pattern"
    break
  fi
done

if [ -n "$WARN" ]; then
  echo "{\"permissionDecision\":\"allow\",\"permissionDecisionReason\":\"$WARN\"}"
else
  echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
fi
