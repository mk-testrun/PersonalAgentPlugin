---
name: energy-tracking
description: >-
  Nutze um die tägliche Energie/Stimmung (1–5) zu erfassen und zu tracken: hängt den Wert an state/mood.jsonl
  an und liefert einen kurzen Trend. Fließt in morning-briefing und week-highlight-reel ein.
---

## Eingabe

Energie-Frage: "Wie ist deine Energie heute? (1–5)"

## Persistenz

Eintrag nach `state/mood.jsonl`:
```json
{"date":"2026-06-23","energy":4,"ts":"2026-06-23T07:30:00Z"}
```

## Ausgabe

Bei Wochenanfang: Vorwochentrend anzeigen.
