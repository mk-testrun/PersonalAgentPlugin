#!/usr/bin/env bash
# setup-mcp-servers.sh — macht alle Custom-MCP-Server nach frischem Clone lauffähig.
#
# Die Plugin-.mcp.json-Dateien referenzieren die Server über ihre bin-Namen
# (anonymizer-proxy, password-gen-mcp, alarm-mcp, artifact-viewer, supertonic3-mcp).
# Damit die Copilot-CLI sie findet, müssen sie auf dem PATH liegen → npm link je Server.
#
#   ./tools/setup-mcp-servers.sh          # install + build (prepare: tsc) + link
#   ./tools/setup-mcp-servers.sh --check  # nur prüfen, nichts ändern
set -euo pipefail
cd "$(dirname "$0")/.."

SERVERS=(anonymizer-proxy password-gen alarm-mcp artifact-viewer supertonic)
BINS=(anonymizer-proxy password-gen-mcp alarm-mcp artifact-viewer supertonic3-mcp)

if [[ "${1:-}" == "--check" ]]; then
  missing=0
  for bin in "${BINS[@]}"; do
    if command -v "$bin" >/dev/null 2>&1; then
      echo "✓ $bin → $(command -v "$bin")"
    else
      echo "✗ $bin fehlt auf dem PATH"; missing=1
    fi
  done
  exit $missing
fi

echo "==> npm install (Workspaces; 'prepare: tsc' baut die TS-Server nach dist/)"
npm install

echo "==> npm link je Server (bin-Namen global auf den PATH)"
for srv in "${SERVERS[@]}"; do
  ( cd "mcp-servers/$srv" && npm link )
done

echo "==> Verifikation"
exec "$0" --check
