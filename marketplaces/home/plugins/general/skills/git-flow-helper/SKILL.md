---
name: git-flow-helper
description: Nutze für Branch-Namen, Cherry-Pick-Planung oder Commit-Message-Korrektur in privaten Repos.
---

## Scope

Leichtgewichtige Git-Hilfen für private Projekte — entspannt, ohne Workitem-Zwang.

## Branch-Naming

- Muster (Empfehlung, kein Zwang): `feat/<kurz>`, `fix/<kurz>`, `chore/<kurz>`.
- Kurz, kebab-case, sprechend; kein Ticket-Präfix nötig.

## Commit-Messages

- Conventional Commits empfohlen: `<type>(<scope>): <summary>` (`feat`/`fix`/`docs`/`refactor`/`test`/`chore`).
- Imperativ, ≤ 72 Zeichen Summary; Body erklärt *warum*.

## Cherry-Pick-Planung

1. Ziel-Commits auflisten (`git log --oneline`).
2. Reihenfolge/Abhängigkeiten prüfen (keine halben Features).
3. `git cherry-pick <sha>…` vorschlagen; Konflikte vorab benennen.

## Guardrails

- **Kein Force-Push auf `main`/`master`** (auch im warn-Modus geblockt).
- Destruktive Git-Operationen (`reset --hard`, `clean -fd`) werden gewarnt — vor Ausführung bestätigen.

## Output

Konkrete Befehlsvorschläge; keine Ausführung destruktiver Schritte ohne Bestätigung.
