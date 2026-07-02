---
name: week-highlight-reel
description: >-
  Nutze um sonntags einen wöchentlichen "Spotify-Wrapped"-Rückblick zu erzeugen: fasst Mood-Trend
  (state/mood.jsonl), Commits/PRs (github-MCP) und die Highlights der Woche als week-<KW>.html zusammen.
  Leichtgewichtiges Home-Ritual, read-mostly; Output nach state/artifacts/.
---

## Inhalt (week-<KW>.html)

1. Mood-Trend aus state/mood.jsonl
2. Commit-Streak der Woche
3. Geschlossene Issues nach Repo
4. Generiertes Bild via visual/image-generate (delegiert)
5. Optional: Audio-Zusammenfassung via audio/speak-summary

## Aktivierung

Automatisch sonntags (wenn `/morning` an einem Sonntag aufgerufen).
