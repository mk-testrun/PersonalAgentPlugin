---
name: gantt-roadmap
description: Nutze um ADO-Iterationen/Roadmap als Mermaid-Gantt-Chart zu rendern.
---

## Zweck

Iterationen/Meilensteine als Zeitplan darstellen (Roadmap-Überblick).

## Quelle & Lib

- Iterationen/Termine aus ADO (über general/ado-Skills) oder manuell.
- Rendering: Mermaid `gantt` (CDN-Allowlist).

## Schema (Mermaid gantt)

```
gantt
  title Roadmap
  dateFormat YYYY-MM-DD
  section Sprint 1
  Feature A :a1, 2026-01-10, 10d
  Feature B :after a1, 7d
```

## Aufbau

1. Sektionen = Iterationen/Teams; Tasks = Work-Items/Epics mit Start + Dauer.
2. Abhängigkeiten via `after <id>`; Meilensteine als `milestone`.
3. Realistische Daten/Dauern; keine PII in Task-Namen (anonymisieren falls aus ADO).
4. Mermaid `gantt` erzeugen, in HTML einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext / Tabelle (Task · Start · Dauer) + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/roadmap-<ts>.html` + Mermaid-Quelle.
