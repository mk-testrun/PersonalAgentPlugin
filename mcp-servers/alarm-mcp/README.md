# alarm-mcp

Alarm-, Timer- und Reminder-MCP-Server mit Plattform-Sound.

## Tools

| Tool | Beschreibung |
|---|---|
| `set_alarm` | Alarm zu bestimmter Zeit (ISO 8601 oder HH:MM) |
| `set_timer` | Countdown-Timer in Sekunden |
| `list_alarms` | Aktive (pending) Alarme/Timer anzeigen |
| `cancel_alarm` | Pending-Alarm nach ID stornieren (vor dem Feuern) |

## Verhalten / Lebenszyklus

Ein Alarm hat genau einen aktiven Zustand: **pending**. Beim Auslösen wird der
Plattform-Sound **zweimal** abgespielt (ein einzelner Ton wird leicht überhört),
danach wechselt der Alarm auf **fired** und gilt als erledigt — er taucht nicht
mehr in `list_alarms` auf und muss nicht manuell aufgeräumt werden.

```
pending ──(Zeit erreicht)──▶ fired   (2× Sound, danach inaktiv)
   │
   └──(cancel_alarm)────────▶ cancelled
```

### Grenzen (wichtig)

Der Server kann den laufenden Agenten **nicht** von sich aus unterbrechen — ein
stdio-MCP hat keinen Push-Kanal. Beim Feuern ertönt der Sound auf dem Host; der
Agent erfährt davon nur, wenn er anschließend `list_alarms` abfragt. Für
„weiterarbeiten und beim Auslösen reagieren" muss der Workflow also aktiv pollen.

### Persistenz & Neustart

Alarme werden in `ALARM_STORE` gespeichert. Beim Start lädt der Server den Store
und **plant pending-Alarme neu ein**. Past-due Alarme feuern beim Laden sofort.

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
