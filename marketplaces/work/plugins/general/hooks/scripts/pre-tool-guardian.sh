#!/usr/bin/env bash
# preToolUse: secret-scan (block) + tool-guardian (block) + git-guardrails (block)
# JSON wird mit node geparst (Node ist Projekt-Voraussetzung; python3 ist es nicht).
# Git-Guardrails kommen aus policy/git-guardrails.json (Override: GIT_GUARDRAILS_POLICY);
# ist die Policy unlesbar, greift eine eingebaute Minimal-Liste (fail-safe: Guardrails
# verschwinden nie stillschweigend).
set -euo pipefail
INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY="${GIT_GUARDRAILS_POLICY:-$SCRIPT_DIR/../../policy/git-guardrails.json}"

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

# Secret-Scan Stufe 2: konkrete Token-Regexe aus betterleaks.toml (Single Source — dieselben
# Rules wie der pre-push-Hook). Reihenfolge: $BETTERLEAKS_CONFIG (Tests/Override) →
# ./.betterleaks.toml (Nutzer-Repo) → gebündeltes Template. Ausgabe ist nur die Rule-ID,
# nie der Treffer selbst (Secrets erscheinen niemals im Klartext).
BL_BUNDLED="$SCRIPT_DIR/../../skills/secrets-prepush-hook/templates/betterleaks.toml"
BL_HIT=$(TOOL_ARGS="$TOOL_ARGS" BL_BUNDLED="$BL_BUNDLED" node -e '
  const fs = require("fs");
  const args = process.env.TOOL_ARGS || "";
  const candidates = [process.env.BETTERLEAKS_CONFIG, ".betterleaks.toml", process.env.BL_BUNDLED].filter(Boolean);
  let toml = "";
  for (const f of candidates) { try { toml = fs.readFileSync(f, "utf8"); break; } catch {} }
  // TOML-Minimalparser: id + regex je [[rules]]-Block (Triple-Quote via \x27, kein Dep noetig)
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

# Tool-guardian deny list (block)
DENY_PATTERNS=("rm -rf" "curl http://" "wget http://" "Invoke-WebRequest")
for pattern in "${DENY_PATTERNS[@]}"; do
  if printf '%s' "$TOOL_ARGS" | grep -qF "$pattern"; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Tool-Guardian: blocked command pattern: '"$pattern"'"}'
    exit 0
  fi
done

# --- Git-Guardrails: Entscheidung aus der Policy-Datei (ADR-0004) ---
GUARD=$(TOOL_ARGS="$TOOL_ARGS" POLICY="$POLICY" node -e '
  const fs = require("fs");
  let args = "";
  try { args = JSON.parse(process.env.TOOL_ARGS || "\"\""); } catch { args = process.env.TOOL_ARGS || ""; }
  if (typeof args !== "string") args = JSON.stringify(args);

  // Policy laden — Fallback auf eingebaute Minimal-Liste (fail-safe).
  const FALLBACK = {
    block: ["git reset --hard", "git clean -fd", "git filter-branch", "git filter-repo"],
    blockBranches: ["main", "master", "develop", "release/"],
    allowExceptions: ["force-with-lease"],
  };
  let policy;
  try { policy = JSON.parse(fs.readFileSync(process.env.POLICY, "utf8")); }
  catch { policy = FALLBACK; }

  const deny = reason => { process.stdout.write(reason); process.exit(0); };
  const hasException = (policy.allowExceptions ?? ["force-with-lease"]).some(e => args.includes(e));

  // Force-Push: --force-with-lease ist bewusst erlaubt (ADR-0004).
  if (/git push[^|;&]*(--force|\s-f\b)/.test(args) && !hasException) {
    if ((policy.blockBranches ?? []).some(b => args.includes(b)))
      deny("Git-Guardrail: force-push auf protected branch verboten");
    deny("Git-Guardrail: git push --force ohne --force-with-lease blockiert");
  }
  // Übrige Block-Patterns aus der Policy (Push-Einträge oben behandelt).
  for (const p of policy.block ?? []) {
    if (p.startsWith("git push")) continue;
    if (args.includes(p)) deny(`Git-Guardrail: ${p} blockiert`);
  }
  // Rebase auf shared branches.
  if (/git rebase/.test(args) && (policy.blockBranches ?? []).some(b => args.includes(b)))
    deny("Git-Guardrail: git rebase auf shared branch blockiert");
' 2>/dev/null || printf '')

if [ -n "$GUARD" ]; then
  echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$GUARD\"}"
  exit 0
fi

echo '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
