#!/usr/bin/env bash
# Play sound notification after long-running tool operations (>30s threshold)
INPUT=$(cat)
DURATION=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('duration',0))" 2>/dev/null || echo "0")
STATUS=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','success'))" 2>/dev/null || echo "success")

if [ "$(echo "$DURATION >= 30" | bc 2>/dev/null || echo 0)" = "1" ]; then
  if [ "$STATUS" = "success" ]; then
    # Success sound
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || \
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || true
  elif [ "$STATUS" = "error" ]; then
    afplay /System/Library/Sounds/Basso.aiff 2>/dev/null || \
      paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga 2>/dev/null || true
  fi
fi
