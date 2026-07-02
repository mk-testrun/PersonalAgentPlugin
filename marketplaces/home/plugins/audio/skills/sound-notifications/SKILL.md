---
name: sound-notifications
description: >-
  Nutze um Benachrichtigungen mit Sound nach langen Operationen (> 30 Sekunden) auszugeben: spielt
  plattformabhängig einen Ton über den postToolUse-Hook. Für gesprochene Zusammenfassungen → speak-summary;
  kein STT.
---

## Schwelle

Aktiviert bei Operationen die > 30 Sekunden dauern.

## Sounds

- Erfolg: Positiver Ton (afplay/paplay/beep)
- Warnung: Warnton
- Fehler: Fehlerton

Wird via postToolUse-Hook in audio/hooks/scripts/ ausgelöst.
