---
name: dependency-graph
description: >-
  Nutze um einen Abhängigkeitsgraphen der Solution (Projekt→Projekt-Referenzen + NuGet) zu erstellen und
  Zyklen sichtbar zu machen: Quelle sharplens, gerendert als Mermaid. Output nach state/artifacts/ mit
  Fallback. Schichten/Design → architecture-diagram.
---

## Zweck

Kopplung sichtbar machen — Projekt→Projekt-Referenzen und externe NuGet-Abhängigkeiten; Zyklen finden.

## Quelle & Lib

- `ProjectReference`/`PackageReference` aus `*.csproj` (bzw. `dotnet list package`), Struktur via sharplens.
- Rendering: Mermaid `flowchart LR` (CDN-Allowlist).

## Aufbau

1. Alle Projekte + ihre `ProjectReference` sammeln → interne Kanten.
2. Optional NuGet-`PackageReference` als externe Knoten (gruppiert).
3. **Zyklen markieren** (A→B→A) — Architektur-Smell, hervorheben.
4. Mermaid `flowchart` erzeugen (Richtung = Abhängigkeit), in HTML einbetten.

## Befunde (Hinweise im Diagramm)

- Zyklus zwischen Projekten → rot markieren.
- Schicht-Verletzung (Domain → Infrastructure) → markieren.

## Render-Pattern (§2.7)

- **Rich:** HTML-Artefakt (Webview).
- **Fallback:** Mermaid-Quelltext + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/depgraph-<ts>.html` + Mermaid-Quelle.
