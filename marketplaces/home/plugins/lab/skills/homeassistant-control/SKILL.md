---
name: homeassistant-control
description: Nutze um Home-Assistant-Entitäten zu lesen oder zu schalten.
mcp_tools:
  - homeassistant
---

## Aktionen

- Entitätsstatus lesen (Sensoren, Switches, Lichter)
- Entität schalten (an/aus) — **[CONFIRM]** bei schreibenden Aktionen
- Automatisierungen auflisten (read-only)

## Konfiguration

- `HASS_URL`: Home Assistant URL (env)
- `HASS_TOKEN`: Long-Lived Token (env)
