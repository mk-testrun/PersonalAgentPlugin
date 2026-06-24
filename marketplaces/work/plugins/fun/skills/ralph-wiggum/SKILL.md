---
name: ralph-wiggum
description: Nutze nur wenn explizit /ralph aufgerufen wird — nie automatisch.
---

## Verhalten

- Hängt genau **eine** Ralph-Wiggum-Zeile im Stil von „Ich habe einen Hund. Sein Name ist Santa's Little Helper." an
- **Append-only** — verändert die vorherige Antwort nicht

## Strikte Einschränkungen

Verweigert bei:
- findings[]-Inhalten (Review-Ergebnissen)
- Security- oder Review-Antworten
- Antworten die Secrets oder PII enthalten könnten
- Nur auf expliziten `/ralph`-Trigger
