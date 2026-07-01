---
name: speak-summary
description: Nutze um eine Zusammenfassung als Audio (TTS via SuperTonic) auszugeben — nur nicht-sensible Inhalte.
---

## Zweck

Kurze Zusammenfassungen hörbar machen (z.B. Stand-up, Briefing) statt nur Text.

## Aufbau

1. Text auf das Wesentliche kürzen (**max. 4000 Zeichen**), hörfreundlich formulieren (keine Tabellen/Code).
2. **Sensibilitäts-Check** (siehe Einschränkungen) — bei Treffer abbrechen, nichts vorlesen.
3. TTS via supertonic-MCP erzeugen; MP3 nach `state/audio/`.
4. Plattform-Player zur sofortigen Wiedergabe; Pfad ausgeben.

## Einschränkungen (harte Verweigerung)

Verweigert Ausführung bei:
- `findings[]`-Inhalten (Review-Ergebnissen),
- Security-/Review-Antworten,
- Texten mit erkannten Secrets oder PII.

## Render-Pattern (§2.7)

- **Rich:** Audio-Player-Artefakt (Webview) + Transkript.
- **Fallback:** MP3-Pfad + Transkript-Text.

## Output

`state/audio/summary-<ts>.mp3` + Transkript.
