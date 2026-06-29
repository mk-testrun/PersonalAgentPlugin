#!/usr/bin/env bash
# Play sound notification after long-running tool operations (>=30s threshold).
# JSON-Parsing + Schwellwert via node (Node ist Projekt-Voraussetzung; kein python3/bc nötig).
INPUT=$(cat)
read -r DURATION STATUS <<EOF
$(printf '%s' "$INPUT" | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    let d = {};
    try { d = JSON.parse(s); } catch {}
    const dur = Number(d.duration) || 0;
    const status = String(d.status || "success").replace(/[^a-z]/gi, "");
    process.stdout.write(dur + " " + (status || "success"));
  });
' 2>/dev/null || printf '0 success')
EOF

# Schwelle: nur bei Operationen >= 30s
if [ "$(node -e "process.stdout.write((Number(process.argv[1])>=30)?'1':'0')" "$DURATION" 2>/dev/null || echo 0)" = "1" ]; then
  if [ "$STATUS" = "success" ]; then
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || \
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || true
  elif [ "$STATUS" = "error" ]; then
    afplay /System/Library/Sounds/Basso.aiff 2>/dev/null || \
      paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga 2>/dev/null || true
  fi
fi
