---
name: mermaid-diagram
description: Nutze um ein Mermaid-Diagramm zu erstellen (Flow, Sequence, Class, State, ER, Gantt).
---

## Zweck

Strukturen/Abläufe als textbasiertes Diagramm — versionierbar, diff-bar.

## Lib/CDN

`mermaid` (CDN-Allowlist). Init: `mermaid.initialize({ startOnLoad: true })`.

## Diagrammtyp wählen

| Typ | Keyword | Wofür |
|---|---|---|
| Flussdiagramm | `flowchart TD/LR` | Abläufe, Entscheidungen |
| Sequenz | `sequenceDiagram` | Interaktion über Zeit |
| Klasse | `classDiagram` | OO-Struktur |
| Zustand | `stateDiagram-v2` | Zustandsautomaten |
| ER | `erDiagram` | Datenmodell |
| Gantt | `gantt` | Zeitplan |

## Aufbau

1. Typ passend zum Inhalt wählen.
2. Mermaid-Quelltext schreiben; Knoten-IDs stabil, Labels in `[]`/`""`.
3. Syntax mental validieren (Pfeile `-->`, Subgraphs korrekt geschlossen).
4. In HTML-Template einbetten (`<pre class="mermaid">…</pre>` + CDN-Script).

## Render-Pattern (§2.7)

- **Rich:** HTML inline (VS Code Webview).
- **Fallback:** Mermaid-Quelltext + Pfad zum HTML in `state/artifacts/`.

## Output

`state/artifacts/diagram-<ts>.html` + der Mermaid-Quelltext (damit editierbar).
