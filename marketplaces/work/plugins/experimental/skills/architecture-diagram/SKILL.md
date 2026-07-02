---
name: architecture-diagram
description: >-
  Nutze um ein C4-Architekturdiagramm (Kontext/Container/Komponenten) aus der .NET-Solution zu erstellen:
  sharplens (Roslyn) liefert Projekte/Referenzen, gerendert als Mermaid-C4. Output nach state/artifacts/ mit
  garantiertem Fallback (§2.7). Datenmodell → er-diagram; Kopplung → dependency-graph.
---

## Zweck

Systemarchitektur auf C4-Ebenen sichtbar machen — Kontext, Container, Komponenten.

## Quelle & Lib

- Struktur aus der Solution via `sharplens` (Projekte/Namespaces/Abhängigkeiten).
- Rendering: Mermaid (`flowchart`/`C4Context` wo verfügbar) aus der CDN-Allowlist.

## C4-Ebene wählen

| Ebene | Zeigt |
|---|---|
| Context | System + externe Akteure/Systeme |
| Container | Apps/Services/DB innerhalb des Systems |
| Component | Module/Schichten innerhalb eines Containers |

## Aufbau

1. Ebene passend zur Frage wählen (meist Container oder Component).
2. Projekte/Module + Abhängigkeitsrichtung aus sharplens ableiten.
3. Mermaid-Quelltext erzeugen (Knoten = Container/Komponente, Kanten = Aufruf/Abhängigkeit).
4. Externe Systeme/Akteure kennzeichnen; Legende ergänzen.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext / ASCII + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/architecture-<ts>.html` + Mermaid-Quelle.
