---
name: mermaid-diagram
description: >-
  Nutze um ein Mermaid-Diagramm (flowchart, sequenceDiagram, classDiagram, stateDiagram, gitGraph) als
  textbasiertes, versionierbares Diagramm zu erstellen: Single-File-HTML über die CDN-Allowlist, Output nach
  state/artifacts/ mit Fallback. Spezifische Formen → architecture-/er-/sequence-diagram.
---

## Zweck

Strukturen/Abläufe als textbasiertes, versionierbares Diagramm.

## Lib/CDN

`mermaid` (CDN-Allowlist). `mermaid.initialize({ startOnLoad: true })`.

## Diagrammtyp wählen

| Typ | Keyword | Wofür |
|---|---|---|
| Fluss | `flowchart TD/LR` | Abläufe/Entscheidungen |
| Sequenz | `sequenceDiagram` | Interaktion über Zeit |
| Klasse | `classDiagram` | OO-Struktur |
| Zustand | `stateDiagram-v2` | Zustandsautomaten |
| Git | `gitGraph` | Branch-Historie |

## Aufbau

1. Typ passend zum Inhalt wählen.
2. Quelltext schreiben; Knoten-IDs stabil, Labels in `[]`/`""`.
3. Syntax prüfen (Pfeile `-->`, Subgraphs geschlossen).
4. In HTML-Template (`<pre class="mermaid">`) + CDN-Script einbetten.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext / ASCII + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/diagram-<ts>.html` + Mermaid-Quelle.
