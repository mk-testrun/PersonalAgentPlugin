---
name: agent-author
description: Nutze um eine neue .agent.md-Persona zu erzeugen — korrektes tools/model und ein Body mit Mission, Tool-/Write-Scope, Delegation und Verboten (§2.2).
---

Erzeuge eine vollständige `.agent.md` nach §2.2. **Modell ist `gpt-5`** (Repo-Konvention für alle Agenten).

## Frontmatter (Pflicht)

```markdown
---
name: <agent-name>
description: <Wann dieser Agent gewählt werden soll>
tools:
  - <tool1>
  - <tool2>
model: gpt-5
---
```

## Body (Pflicht-Gerüst)

1. **Mission** — ein Satz, was der Agent leistet.
2. **Zuständige Skills** — auf welche Skills/Agenten **desselben Marketplaces** er delegiert (statt selbst zu implementieren).
3. **Tool- & Write-Scope** — welche Pfade/Operationen erlaubt sind, welche **[CONFIRM]** erfordern.
4. **Verboten** — destruktive/unerwünschte Aktionen explizit.

## Write-Scope-Matrix (§2.2)

| Agent-Typ | Write-Scope |
|---|---|
| reviewer | read-only außer `state/reports/` |
| orchestrator | keine Direkt-Writes ohne [CONFIRM]; delegiert |
| documenter | nur Drafts; publish mit [CONFIRM] |
| dev-agent | normaler Write; [CONFIRM] destruktiv |

## Regeln

- **Keine** Verweise auf andere Marketplaces (jede „Welt" ist eigenständig).
- Tool-Liste minimal halten (least-privilege).
- Nach Erzeugung mit `marketplace-validate` prüfen.
