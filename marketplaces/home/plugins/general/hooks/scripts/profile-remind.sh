#!/usr/bin/env bash
# sessionStart: NUR eine Erinnerung ans zuletzt aktive MCP-Profil (stdout → Session-Kontext).
# Bewusst KEIN automatisches `copilot mcp enable/disable` aus einem Hook heraus — die Semantik
# (Hook-Prozess ↔ CLI-Laufzeit) ist nicht verifiziert; Umschalten bleibt Sache des
# profile-switch-Skills auf ausdrücklichen Wunsch.
STATE=".copilot/state/profile.json"
[ -f "$STATE" ] || exit 0
node -e '
  try {
    const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    if (s.profile) process.stdout.write(
      `Hinweis: zuletzt aktives MCP-Profil war "${s.profile}" (seit ${s.appliedAt ?? "?"}). ` +
      `Umschalten: profile-switch-Skill ("/profile <name>").\n`);
  } catch {}
' "$STATE" 2>/dev/null || true
