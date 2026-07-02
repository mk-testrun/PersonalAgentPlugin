---
name: morning-briefing
description: >-
  Nutze für das tägliche Morgen-Briefing-Dashboard: bündelt Issues-Trend (7 Tage), offene PRs, Energie-Trend
  und den Tagesfokus als morning-<date>.html. Zieht Daten über github-/fetch-MCP; delegiert die
  Audio-Begrüßung an audio/speak-summary.
---

## Dashboard-Inhalt (morning-<date>.html)

1. Issues-Trend (offene/geschlossene Issues der letzten 7 Tage)
2. Commit-Streak-Heatmap
3. Wetter-Widget (via fetch, Standort aus env oder Standardort)
4. Top-3 offene Issues (priorisiert)

## Audio

Falls `moin.speak` aktiviert: audio/speak-summary delegieren (nicht selbst TTS implementieren).

## Output

- HTML nach `state/artifacts/morning-<date>.html`
- Browser öffnen (plattformabhängig)
