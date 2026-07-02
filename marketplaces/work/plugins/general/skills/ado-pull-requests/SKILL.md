---
name: ado-pull-requests
description: >-
  Nutze wenn Pull Requests in Azure DevOps aufgelistet, geöffnet, mit Reviewern besetzt, an Work-Items
  verlinkt oder (squash) für den Merge vorbereitet werden sollen. Arbeitet über den ADO-MCP hinter dem
  anonymizer-proxy (PII-geschützt): listet offene PRs in zwei Sichten, öffnet PRs mit Titel/Beschreibung aus
  dem Branch und setzt Auto-Complete erst nach [CONFIRM].
---

## Aktionen

### list-open-prs
Zwei Sichten:
1. Meine offenen PRs
2. PRs wo `@me` Reviewer ist und Vote = 0 (noch nicht abgestimmt)

### open
PR von aktuellem Branch nach `main` öffnen:
- Work-Item via Branch-Name verlinken (`AB#<id>`)
- Standard-Reviewer aus `${env:ADO_LEAD_ID}` setzen
- Branch-Policy-Defaults laden
- **[CONFIRM]** vor dem Erstellen

### reviewers
Reviewer hinzufügen/entfernen — **[CONFIRM]**

### ready
PR als "Ready for Review" markieren (aus Draft-Status).

### autocomplete
Auto-Complete (Squash-Merge) aktivieren — **[CONFIRM]**

## Hinweise

- Alle schreibenden Operationen: **[CONFIRM]**
- Nie Force-Push auf `main`/`develop`/`release/*`
