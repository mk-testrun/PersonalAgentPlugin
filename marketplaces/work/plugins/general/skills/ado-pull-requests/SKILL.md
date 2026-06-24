---
name: ado-pull-requests
description: Nutze wenn PRs in Azure DevOps aufgelistet, geöffnet, Reviewer gesetzt oder für Merge vorbereitet werden sollen.
mcp_tools:
  - ado.git
  - ado.workitems
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
