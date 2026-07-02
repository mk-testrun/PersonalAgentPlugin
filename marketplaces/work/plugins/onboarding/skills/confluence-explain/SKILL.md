---
name: confluence-explain
description: >-
  Nutze wenn Confluence-Architekturseiten für Neueinsteiger erklärt werden sollen: liest Architektur-Seiten
  read-only aus ${env:CONFLUENCE_SPACES} über den confluence-MCP und erklärt Diagramme, Flows und Begriffe
  verständlich, ohne zu ändern. Ergänzt codebase-tour um die dokumentierte Sicht.
---

## Verhalten

- Lese Architektur-Seiten aus `${env:CONFLUENCE_SPACES}` (read-only)
- Erkläre Diagramme und Flows verständlich
- Verweise auf konkrete Code-Stellen
- **Schreibe nie zurück** — auch keine Kommentare
- Nie Secret-Werte nennen auch wenn sie in Confluence stehen
