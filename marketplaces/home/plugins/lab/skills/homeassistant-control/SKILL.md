---
name: homeassistant-control
description: >-
  Nutze um Home-Assistant-Entitäten zu lesen oder zu schalten: Status von Sensoren/Switches/Lichtern lesen und
  Aktionen auslösen — über den homeassistant-MCP (HASS_URL/HASS_TOKEN). Warn-Modus; bestätigt schaltende
  Aktionen.
---

## Aktionen

- Entitätsstatus lesen (Sensoren, Switches, Lichter)
- Entität schalten (an/aus) — **[CONFIRM]** bei schreibenden Aktionen
- Automatisierungen auflisten (read-only)

## Konfiguration

- `HASS_URL`: Home Assistant URL (env)
- `HASS_TOKEN`: Long-Lived Token (env)
