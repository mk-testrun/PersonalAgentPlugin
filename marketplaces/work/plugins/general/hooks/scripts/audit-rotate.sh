#!/usr/bin/env bash
# sessionEnd: Audit-Log auf die letzten 90 Tage kürzen. JSON-Filter via node.
AUDIT_FILE=".copilot/state/audit.jsonl"
if [ -f "$AUDIT_FILE" ]; then
  CUTOFF=$(date -u -d '90 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-90d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
  if [ -n "$CUTOFF" ]; then
    CUTOFF="$CUTOFF" AUDIT_FILE="$AUDIT_FILE" node -e '
      const fs = require("fs");
      const file = process.env.AUDIT_FILE, cutoff = process.env.CUTOFF;
      try {
        const kept = fs.readFileSync(file, "utf8").split("\n")
          .filter(l => l.trim())
          .filter(l => { try { return (JSON.parse(l).ts || "") >= cutoff; } catch { return false; } });
        fs.writeFileSync(file, kept.length ? kept.join("\n") + "\n" : "");
      } catch {}
    ' 2>/dev/null || true
  fi
fi
echo "{\"event\":\"sessionEnd\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$AUDIT_FILE"
