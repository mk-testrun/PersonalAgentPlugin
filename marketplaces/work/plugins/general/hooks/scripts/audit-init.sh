#!/usr/bin/env bash
AUDIT_FILE=".copilot/state/audit.jsonl"
mkdir -p "$(dirname "$AUDIT_FILE")"
echo "{\"event\":\"sessionStart\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$AUDIT_FILE"
