---
name: git-flow-helper
description: Nutze wenn Branch-Namen generiert, Cherry-Picks geplant oder Commit-Nachrichten nachträglich angepasst werden sollen.
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
