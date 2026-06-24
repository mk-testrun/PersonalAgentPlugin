#!/usr/bin/env bash
# Rotate audit log — keep last 90 days of entries
AUDIT_FILE=".copilot/state/audit.jsonl"
if [ -f "$AUDIT_FILE" ]; then
  CUTOFF=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-90d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
  if [ -n "$CUTOFF" ]; then
    python3 -c "
import sys, json
cutoff = '$CUTOFF'
with open('$AUDIT_FILE') as f:
  lines = [l for l in f if l.strip()]
kept = [l for l in lines if json.loads(l).get('ts','') >= cutoff]
with open('$AUDIT_FILE', 'w') as f:
  f.writelines(kept)
" 2>/dev/null || true
  fi
fi
echo "{\"event\":\"sessionEnd\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$AUDIT_FILE"
