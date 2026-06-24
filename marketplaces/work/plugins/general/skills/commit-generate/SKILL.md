---
name: commit-generate
description: Nutze wenn eine Conventional-Commit-Nachricht aus dem aktuellen Staged-Diff generiert werden soll.
---

## Schema

```
<type>(<scope>)<!>: <subject>

[body — optional]

Refs: AB#<id>
```

**Typen:** `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `perf` / `ci`

## Schritte

1. `git diff --staged` lesen
2. Dominanten Change-Typ und Scope (Datei/Modul) ableiten
3. Subject: imperativ, max. 72 Zeichen, kein Punkt am Ende
4. Bei mehreren unabhängigen Änderungen: 1 Hauptcommit + ≤2 Splits vorschlagen
5. `Refs: AB#<id>` aus Branch-Name extrahieren (`feature/AB-1234-...` → `AB#1234`)

## Regeln

- Kein automatischer Commit — Nachricht zur Bestätigung zeigen
- Keine Passwörter / Tokens / PII in der Commit-Message
- Breaking Change → `!` nach Scope und BREAKING CHANGE Footer
