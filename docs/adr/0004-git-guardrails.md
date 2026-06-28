# ADR 0004 — Git-Guardrails (§2.10)

**Status:** Accepted  
**Datum:** 2026-06-28  
**Quelle:** Addendum v2, N2  
**Credit:** Adaptiert von `mattpocock/skills · git-guardrails-claude-code`

## Kontext

Ohne Guardrails kann der Agent versehentlich destruktive Git-Operationen ausführen:
`git push --force` auf main, `git reset --hard`, `git filter-branch` usw. — alles Aktionen
die Commit-History zerstören oder protected Branches korrumpieren.

## Entscheidung

Git-Guardrails werden als `preToolUse`-Erweiterung in den `tool-guardian`-Skripten beider
Marketplaces implementiert. Die Konfiguration liegt als `policy/git-guardrails.json` im
jeweiligen `general`-Plugin.

### Work-Modus (block)
Alle definierten Guardrails → `permissionDecision: "deny"`.

### Home-Modus (warn)
- Force-Push auf `main`/`master` → immer `deny`
- Alle anderen Guardrails → `allow` + Warnung (warn-Modus gemäß §2.9)

## Gesperrte Operationen

| Operation | Work | Home |
|---|---|---|
| `git push --force` auf main/master | deny | deny |
| `git push --force` auf anderen Branches | deny | warn |
| `git reset --hard` | deny | warn |
| `git clean -fd[x]` | deny | warn |
| `git branch -D` | deny | warn |
| `git checkout -f` / `git switch -f` | deny | warn |
| `git update-ref -d` | deny | warn |
| `git reflog delete` | deny | warn |
| `git filter-branch` / `filter-repo` | deny | warn |
| `git rebase` auf shared branches | deny | — |

## Konsequenzen

- Force-Push mit `--force-with-lease` bleibt erlaubt (nicht in der Deny-Liste)
- Der Agent muss dem Nutzer erklären warum eine Operation blockiert wurde
- Der Nutzer kann Guardrails temporär durch explizite Bestätigung umgehen (über die Shell direkt)
