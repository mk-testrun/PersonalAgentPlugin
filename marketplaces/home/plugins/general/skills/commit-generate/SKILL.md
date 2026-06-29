---
name: commit-generate
description: Nutze um eine Conventional-Commit-Nachricht aus dem staged diff zu generieren — Typ/Scope/Subject ableiten, Body mit Begründung. Kein Auto-Commit.
---

## Scope

Erzeugt eine Commit-Nachricht aus `git diff --staged`. Workitem-Referenz optional (kein Zwang).

## Schema

`<type>(<scope>)<!>: <subject>` + optionaler Body.

| type | wofür |
|---|---|
| feat | neue Funktion |
| fix | Bugfix |
| docs | nur Doku |
| refactor | Umbau ohne Verhaltensänderung |
| perf | Performance |
| test | Tests |
| chore | Build/Tooling/Sonstiges |

- `<scope>` = betroffener Bereich (optional). `!` = Breaking Change (zusätzlich `BREAKING CHANGE:` im Body).
- Subject: Imperativ, ≤ 72 Zeichen, kein Punkt am Ende.

## Schritte

1. `git diff --staged` analysieren → dominanten Typ + Scope ableiten.
2. Subject knapp formulieren; Body erklärt **warum** (nicht was).
3. Bei mehreren unzusammenhängenden Änderungen: Aufteilen in mehrere Commits vorschlagen.

## Beispiel

```
feat(auth): add JWT refresh-token rotation

Bisher waren Refresh-Tokens unbegrenzt gültig. Rotation invalidiert das
alte Token bei jedem Refresh.
```

## Output

Vorgeschlagene Commit-Nachricht. **Kein automatischer Commit** — zeigen + bestätigen lassen.
