---
name: git-flow-helper
description: >-
  Nutze wenn Branch-Namen nach Schema generiert (feature/AB-<id>-<slug>, bugfix/…), Cherry-Picks geplant oder
  Commit-Nachrichten nachträglich angepasst werden sollen. Leitet konsistente Namen aus Work-Item-ID + Titel
  ab und plant Cherry-Pick-Reihenfolgen — unter Git-Guardrails (kein destruktives History-Rewrite ohne
  [CONFIRM]).
---

## Aktionen

### branch-name
Schema: `feature/AB-<id>-<slug>` bzw. `bugfix/AB-<id>-<slug>`
- Slug: Titel lowercase, Sonderzeichen → `-`, max. 40 Zeichen

### cherry-pick-plan
Commits für Cherry-Pick auswählen und Reihenfolge prüfen — nur Plan, kein Auto-Execute.

### amend-message
Commit-Nachricht des letzten Commits korrigieren via `git commit --amend`:
- **Nur auf nicht-geteilten Branches** (never shared branch)
- Prüfe ob Branch remote gepusht ist — wenn ja: warnen

## Verboten

- Force-Push auf `main` / `develop` / `release/*`
- `git push --force` ohne explizite Bestätigung
