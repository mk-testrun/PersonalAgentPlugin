---
name: ado-workitems
description: >-
  Nutze wenn Work-Items in Azure DevOps aufgelistet, erstellt, geschlossen oder gereviewt werden sollen —
  inklusive WIQL-Queries (z. B. unassignte oder offene Items). Läuft über den ADO-MCP hinter dem
  anonymizer-proxy (PII-Pseudonyme); schreibende Aktionen (create/close/update) erst nach [CONFIRM], Duplikate
  werden vermieden.
---

## Aktionen

### list-unassigned
WIQL-Query: Work-Items im Projekt ohne Assignee, Status nicht Closed/Done.

### list-mine
WIQL-Query: Work-Items assigned to me, Status Active/Doing.

### list-bugs
WIQL-Query: offene Bugs im Projekt, nach Severity sortiert.

### create-task / create-story / create-bug
Templates für neue Work-Items:
- Titel, Beschreibung, Akzeptanzkriterien
- DoR-Checkliste als Kommentar anhängen
- **[CONFIRM]** vor dem Erstellen

### close-task / close-story / close-bug
Status-Übergang auf "Done" — **[CONFIRM]** vor dem Schließen.

### review-workitem
Item-Details lesen und Verbesserungen (Titel/Akzeptanzkriterien/Tags) vorschlagen (kein Auto-Write).

## Hinweise

- Titel können PII enthalten → laufen durch anonymizer-proxy, Pseudonyme im Modell
- >10 Items → HTML-Artefakt mit Filterbar anbieten statt Inline-Ausgabe
- Alle schreibenden Operationen erfordern **[CONFIRM]**
