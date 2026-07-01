---
name: speak-summary
description: Nutze wenn eine Zusammenfassung als Audio (TTS) ausgegeben werden soll.
---

## Verhalten

- Max. 4000 Zeichen
- MP3 nach `state/audio/`
- Plattform-Player für sofortige Wiedergabe

## Strikte Einschränkungen

Verweigert bei:
- findings[]-Inhalten (Review-Ergebnissen)
- Security-/Review-Antworten
- Texten mit erkannten Secrets oder PII
