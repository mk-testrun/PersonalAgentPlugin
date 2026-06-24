---
description: Conventional Commit-Nachricht aus dem aktuellen Staged-Diff generieren.
---

Nutze den Skill commit-generate:
- Analysiere `git diff --staged`
- Generiere eine Conventional-Commit-Nachricht nach Schema `<type>(<scope>)<!>: <subj>`
- Maximal 1 Hauptcommit + ≤2 Splits vorschlagen
- Füge `Refs: AB#<id>` aus dem Branch-Namen als Footer an
- Committe **nicht** automatisch — zeige erst die Nachricht zur Bestätigung
