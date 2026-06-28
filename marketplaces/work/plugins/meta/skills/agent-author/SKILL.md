---
name: agent-author
description: Nutze wenn du eine neue .agent.md-Persona erzeugen willst mit korrektem tools/model/Write-Scope nach §2.2 der Architektur-Konvention.
---

Erzeuge eine vollständige `.agent.md`-Datei nach §2.2-Konvention:

**Pflichtfelder:**
```markdown
---
name: <agent-name>
description: <Wann Copilot diesen Agenten wählen soll>
tools:
  - <tool1>
  - <tool2>
model: claude-opus-4-8
---

# <Agent-Name>

## Write-Scope
<Was der Agent schreiben darf — explizit, eng gefasst>

## Verhalten
<Kernverhalten, Entscheidungsregeln>

## [CONFIRM]-Punkte
<Liste destruktiver Aktionen die immer [CONFIRM] erfordern>
```

**Write-Scope-Matrix (§2.2):**
| Agent-Typ | Write-Scope |
|---|---|
| reviewer | read-only außer `state/reports/` |
| orchestrator | keine Direkt-Writes ohne [CONFIRM] |
| documenter | nur Drafts; publish mit [CONFIRM] |
| dev-agent | normaler Write; [CONFIRM] destruktiv |

**Validierung:** Nach Erzeugung mit `marketplace-validate` prüfen.
