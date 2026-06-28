---
name: triage
description: Nutze wenn du ADO Work Items einheitlich labeln und priorisieren willst (Severity, Priorität, Typ) nach policy/labels.json. Grundlage für /standup und Backlog-Planung. Erst nach [CONFIRM] schreiben.
---

Weise jedem Work Item konsistente Labels zu basierend auf `policy/labels.json`:

**Schema:**
```
Severity:   critical | high | medium | low | info
Priorität:  P0 (jetzt) | P1 (diese Woche) | P2 (nächste Sprint) | P3 (Backlog)
Typ:        bug | feature | tech-debt | documentation | security | performance
Status:     triage | ready | in-progress | blocked | done
```

**Triage-Regeln:**
| Situation | Severity | Priorität |
|---|---|---|
| Produktion ausgefallen | critical | P0 |
| Sicherheitslücke aktiv ausgenutzt | critical | P0 |
| Datenverlust möglich | high | P0–P1 |
| Feature-Regression | high | P1 |
| Fehler mit Workaround | medium | P2 |
| Kosmetik/UX | low | P3 |

**Ablauf:**
1. Lade offene Work Items (Status: triage) aus ADO via anonymizer-proxy
2. Zeige Triage-Vorschläge mit Begründung
3. [CONFIRM] vor Speichern
4. Update per ADO-MCP (Patch, keine Duplikate)

**Standup-Integration:** Nach Triage wird `/standup` automatisch aktualisierte P0/P1-Items anzeigen.

**Idempotenz:** Bereits gelabelte Items werden nur aktualisiert wenn Severity/Priorität sich verändert haben.
