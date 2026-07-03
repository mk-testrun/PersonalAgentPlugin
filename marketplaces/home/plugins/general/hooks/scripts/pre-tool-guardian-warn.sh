#!/usr/bin/env bash
# warn-Modus: Denylist-Treffer → allow + Warnung (KEIN deny). Ausnahme: secret-scan/destruktiv bleiben block.
# JSON via node (Node ist Projekt-Voraussetzung; python3 ist es nicht).
# Git-Guardrails kommen aus policy/git-guardrails.json (Override: GIT_GUARDRAILS_POLICY);
# unlesbare Policy → eingebaute Minimal-Liste (fail-safe).
set -euo pipefail
INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY="${GIT_GUARDRAILS_POLICY:-$SCRIPT_DIR/../../policy/git-guardrails.json}"

# Fail-closed: nicht-leerer Input, der kein JSON ist, wird geblockt (auch im warn-Modus) —
# ein Guardian, der seinen Input nicht versteht, darf nichts durchwinken. Leer → allow.
if [[ "$INPUT" =~ [^[:space:]] ]]; then
  if ! printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{JSON.parse(s)}catch{process.exit(1)}})' 2>/dev/null; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Guardian: unparseable hook input (fail-closed)"}'
    exit 0
  fi
fi

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

# Secret-Scan Stufe 2: konkrete Token-Regexe aus betterleaks.toml — BLOCK auch im warn-Modus.
# Reihenfolge: $BETTERLEAKS_CONFIG (Tests/Override) → ./.betterleaks.toml (Nutzer-Repo) →
# gebündelte policy/betterleaks.toml. Ausgabe nur die Rule-ID, nie der Treffer.
BL_BUNDLED="$SCRIPT_DIR/../../policy/betterleaks.toml"
BL_HIT=$(TOOL_ARGS="$TOOL_ARGS" BL_BUNDLED="$BL_BUNDLED" node -e '
  const fs = require("fs");
  const args = process.env.TOOL_ARGS || "";
  const candidates = [process.env.BETTERLEAKS_CONFIG, ".betterleaks.toml", process.env.BL_BUNDLED].filter(Boolean);
  let toml = "";
  for (const f of candidates) { try { toml = fs.readFileSync(f, "utf8"); break; } catch {} }
  const ruleRe = new RegExp("\\[\\[rules\\]\\][\\s\\S]*?id\\s*=\\s*\"([^\"]+)\"[\\s\\S]*?regex\\s*=\\s*\\x27{3}([\\s\\S]*?)\\x27{3}", "g");
  let m;
  while ((m = ruleRe.exec(toml))) {
    try {
      if (new RegExp(m[2].trim()).test(args)) {
        process.stdout.write(m[1].replace(/[^A-Za-z0-9_-]/g, ""));
        break;
      }
    } catch {}
  }
' 2>/dev/null || printf '')
if [ -n "$BL_HIT" ]; then
  echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Secret-Scan (betterleaks): ${BL_HIT} pattern detected in tool arguments\"}"
  exit 0
fi

# Forkbomb-Signatur oder rm -rf /: BLOCK
if printf '%s' "$TOOL_ARGS" | grep -qF ':(){' || printf '%s' "$TOOL_ARGS" | grep -qE 'rm -rf /'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: destructive system command blocked"}'
  exit 0
fi

# --- Git-Guardrails aus der Policy: blockAlways (Regex) → deny · warn (Substring) → allow+Warnung ---
GUARD=$(TOOL_ARGS="$TOOL_ARGS" POLICY="$POLICY" node -e '
  const fs = require("fs");
  let args = "";
  try { args = JSON.parse(process.env.TOOL_ARGS || "\"\""); } catch { args = process.env.TOOL_ARGS || ""; }
  if (typeof args !== "string") args = JSON.stringify(args);

  const FALLBACK = {
    blockAlways: ["git push --force.*(main|master)", "git push -f.*(main|master)"],
    warn: ["git reset --hard", "git clean -fd", "git filter-branch", "git filter-repo"],
    allowExceptions: ["force-with-lease"],
  };
  let policy;
  try { policy = JSON.parse(fs.readFileSync(process.env.POLICY, "utf8")); }
  catch { policy = FALLBACK; }

  const hasException = (policy.allowExceptions ?? ["force-with-lease"]).some(e => args.includes(e));

  // blockAlways: Regex-Patterns → deny (force-with-lease ausgenommen, ADR-0004)
  if (!hasException) {
    for (const p of policy.blockAlways ?? []) {
      try { if (new RegExp(p).test(args)) { process.stdout.write("DENY\tGit-Guardrail: force-push auf main/master verboten"); process.exit(0); } }
      catch { /* kaputtes Pattern überspringen */ }
    }
  }
  // warn: Substring-Patterns → allow + Warnung
  for (const p of policy.warn ?? []) {
    if (p.startsWith("git push")) {
      if (!hasException && /git push[^|;&]*(--force|\s-f\b)/.test(args)) {
        process.stdout.write("WARN\tGit-Guardrail (warn): git push --force ohne --force-with-lease"); process.exit(0);
      }
      continue;
    }
    if (args.includes(p)) { process.stdout.write(`WARN\tGit-Guardrail (warn): ${p}`); process.exit(0); }
  }
' 2>/dev/null || printf '')

if [ -n "$GUARD" ]; then
  KIND="${GUARD%%$'\t'*}"; MSG="${GUARD#*$'\t'}"
  if [ "$KIND" = "DENY" ]; then
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$MSG\"}"
  else
    echo "{\"permissionDecision\":\"allow\",\"permissionDecisionReason\":\"$MSG\"}"
  fi
  exit 0
fi

# Unverschlüsseltes HTTP → Warnung
if printf '%s' "$TOOL_ARGS" | grep -qiE 'curl http://|wget http://'; then
  echo '{"permissionDecision":"allow","permissionDecisionReason":"Tool-Guardian (warn): unencrypted HTTP detected"}'
  exit 0
fi

echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
