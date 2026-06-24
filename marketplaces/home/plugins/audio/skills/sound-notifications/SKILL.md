---
name: sound-notifications
description: Nutze um Benachrichtigungen mit Sound nach langen Operationen auszugeben.
---

## Schwelle

Aktiviert bei Operationen die > 30 Sekunden dauern.

## Sounds

- Erfolg: Positiver Ton (afplay/paplay/beep)
- Warnung: Warnton
- Fehler: Fehlerton

Wird via postToolUse-Hook in audio/hooks/scripts/ ausgelöst.
