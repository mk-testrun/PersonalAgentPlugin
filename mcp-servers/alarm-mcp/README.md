# alarm-mcp

Alarm-, Timer- und Reminder-MCP-Server mit Plattform-Sound und optionaler Desktop-Benachrichtigung.

## Tools

| Tool | Beschreibung |
|---|---|
| `set_alarm` | Alarm zu bestimmter Zeit (ISO 8601 oder HH:MM) |
| `set_timer` | Countdown-Timer in Sekunden |
| `list_alarms` | Alle aktiven Alarme/Timer anzeigen |
| `cancel_alarm` | Alarm nach ID stornieren |

## Build & Start

```bash
npm install
npm run build
alarm-mcp
```

## Wiring (`.mcp.json`)

```json
{
  "mcpServers": {
    "alarm-mcp": {
      "command": "alarm-mcp",
      "env": {
        "ALARM_STORE": "${env:USERPROFILE}/.copilot/state/alarms.json"
      }
    }
  }
}
```

## Persistenz

Alarme werden in `ALARM_STORE` (default: `.copilot/state/alarms.json`) gespeichert.

## Sound-Trigger (plattformabhängig)

| Plattform | Befehl |
|---|---|
| macOS | `afplay /System/Library/Sounds/Glass.aiff` |
| Linux | `paplay /usr/share/sounds/freedesktop/stereo/complete.oga` |
| Windows | PowerShell `[console]::beep(880,500)` |

## Test

```bash
npm run build
node test/scheduler.test.mjs
```
