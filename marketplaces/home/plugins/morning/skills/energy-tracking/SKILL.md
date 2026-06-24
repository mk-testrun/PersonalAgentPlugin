---
name: energy-tracking
description: Nutze um die tägliche Energie/Stimmung zu erfassen und zu tracken.
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
