---
name: speak-summary
description: >-
  Nutze wenn eine Zusammenfassung als Audio (TTS) ausgegeben werden soll (max. 4000 Zeichen): erzeugt Sprache
  über den supertonic-MCP (on-device), MP3 nach state/audio/, plus Transkript. Verweigert bei
  findings[]/Security-Antworten/Secrets/PII — nur nicht-sensible Inhalte.
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
