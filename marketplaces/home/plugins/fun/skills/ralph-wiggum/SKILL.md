---
name: ralph-wiggum
description: Nutze nur wenn explizit /ralph aufgerufen wird.
---

## Verhalten

- Append-only: eine Ralph-Wiggum-Zeile anhängen
- Tägliches Easter-Egg nach `/tagesabschluss` wenn `dailyEasterEgg: true`
- Mascot-Sticker in Slides wenn frontend-slides leeren Footer hat und `slidesMascot: true`

## Einschränkungen

Nie in: Security/Review-Antworten, findings[], Energie-Frage-Kontext, Secrets.

## Konfiguration

Via `config.json`:
```json
{
  "dailyEasterEgg": false,
  "slidesMascot": false,
  "neverIn": ["security", "review", "findings", "energy"]
}
```
