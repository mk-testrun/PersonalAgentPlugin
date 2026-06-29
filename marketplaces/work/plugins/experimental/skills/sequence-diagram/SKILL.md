---
name: sequence-diagram
description: Nutze um ein Sequenzdiagramm aus einem konkreten Code-Pfad zu generieren.
---

## Zweck

Interaktion mehrerer Teilnehmer über die Zeit nachvollziehbar machen (Request→Response-Kette).

## Quelle & Lib

- Aufruf-Kette aus dem Code (via sharplens/Trace eines Flows).
- Rendering: Mermaid `sequenceDiagram` (CDN-Allowlist).

## Schema (Mermaid)

```
sequenceDiagram
  participant UI
  participant API
  participant DB
  UI->>API: POST /order
  API->>DB: INSERT order
  DB-->>API: id
  API-->>UI: 201 Created
```
`->>` synchroner Call, `-->>` Antwort; `alt`/`opt`/`loop` für Verzweigungen.

## Aufbau

1. Einen konkreten Flow wählen (z.B. „Bestellung anlegen").
2. Teilnehmer identifizieren (UI/Controller/Service/DB/externe Systeme).
3. Aufrufe in Reihenfolge; Fehler-/Bedingungspfade mit `alt`/`opt`.
4. Mermaid erzeugen, in HTML-Template einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/sequence-<ts>.html` + Mermaid-Quelle.
