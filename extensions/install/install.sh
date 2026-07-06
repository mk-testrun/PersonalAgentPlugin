#!/usr/bin/env bash
# User-Scope-Installer (Ausführungsplan §2, Schritt 1.6).
# Publiziert die .NET-Heads und verlinkt/kopiert host/<name>/ nach ~/.copilot/extensions/.
set -euo pipefail

MODE="link"; ONLY=""; WITH_RECORDER=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2;;
    --only) ONLY="$2"; shift 2;;
    --with-recorder) WITH_RECORDER=1; shift;;
    *) echo "unbekannt: $1" >&2; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT="mkc-work-guardian mkc-work-sentinel mkc-work-flow"
[[ $WITH_RECORDER -eq 1 ]] && DEFAULT="$DEFAULT mkc-work-recorder"
EXTS="${ONLY:-$DEFAULT}"
TARGET_ROOT="$HOME/.copilot/extensions"
mkdir -p "$TARGET_ROOT"

# Portabel (kein GNU-sed \U): erstes Zeichen groß via tr.
pascal() {
  local s="${1#mkc-work-}"
  printf '%s%s' "$(printf '%s' "${s:0:1}" | tr '[:lower:]' '[:upper:]')" "${s:1}"
}

for e in $EXTS; do
  proj="Mkc.Copilot.Extensions.$(pascal "$e")"
  echo ">> publish $proj"
  dotnet publish "$ROOT/src/$proj" -c Release -o "$ROOT/host/$e/bin" --nologo -v q
  target="$TARGET_ROOT/$e"
  rm -rf "$target"
  if [[ "$MODE" == "link" ]]; then
    ln -s "$ROOT/host/$e" "$target"
  else
    cp -r "$ROOT/host/$e" "$target"
    cp "$ROOT/host/lib/bridge.mjs" "$target/bridge.mjs"   # Einzeiler materialisieren
  fi
  echo "   installiert: $e ($MODE)"
done
echo "Fertig. In der CLI: /extensions list"
