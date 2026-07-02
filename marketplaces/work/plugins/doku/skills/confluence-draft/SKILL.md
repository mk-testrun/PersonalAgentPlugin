---
name: confluence-draft
description: >-
  Nutze für Confluence-Drafts, -Suche, -Lesen und -Verlinken mit Work-Items: durchsucht Seiten in der
  Space-Allowlist, liest und erklärt Inhalte, bereitet neuen Seiteninhalt als lokalen Draft vor und schlägt
  Kommentare vor. Läuft über den confluence-MCP (mcp-atlassian); Publish nur nach [CONFIRM], PII anonymisiert.
---

## Aktionen

- **search:** Confluence-Seiten in Space-Allowlist durchsuchen
- **read:** Seite lesen und Inhalt erklären
- **draft:** neuen Seiteninhalt als lokalen Draft vorbereiten
- **comment:** Kommentar-Vorschlag erstellen (publish via [CONFIRM])
- **link-to-workitem:** Work-Item-Referenz in Seite einfügen

## Regeln

- Auto-Publish: **nie** — immer [CONFIRM]
- Space-Allowlist: `${env:CONFLUENCE_SPACES}`
- PII-anonymisiert durch proxy
