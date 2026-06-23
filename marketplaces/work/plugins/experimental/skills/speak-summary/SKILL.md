---
name: speak-summary
description: Nutze wenn eine Zusammenfassung als Audio (TTS via SuperTonic) auszugeben — nur nicht-sensible Inhalte.
---

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt als MCP-UI-Resource inline (VS Code Webview)
- **Fallback:** Mermaid-Quelltext / ASCII + Pfad zu state/artifacts/



## Einschränkungen

Verweigert Ausführung bei:
- findings[]-Inhalten
- Security-/Review-Antworten
- Texten mit erkannten Secrets oder PII

Max. 4000 Zeichen. MP3 nach `state/audio/`.
