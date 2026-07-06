#!/usr/bin/env bash
# Entfernt die Links/Kopien aus ~/.copilot/extensions/. Projektlokaler State bleibt erhalten.
set -euo pipefail
TARGET_ROOT="$HOME/.copilot/extensions"
for e in mkc-work-guardian mkc-work-sentinel mkc-work-flow mkc-work-recorder; do
  if [[ -e "$TARGET_ROOT/$e" || -L "$TARGET_ROOT/$e" ]]; then
    rm -rf "$TARGET_ROOT/$e"
    echo "entfernt: $e"
  fi
done
echo "State unter .copilot/state/extensions/mkc/ und .copilot/planning/ wurde nicht angetastet."
