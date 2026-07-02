---
name: changelog-generate
description: >-
  Nutze wenn ein Keep-a-Changelog-Eintrag seit dem letzten Git-Tag generiert werden soll. Liest git describe
  --tags und git log <tag>..HEAD, gruppiert die Conventional-Commit-Typen (feat/fix/…) in
  Added/Changed/Fixed/Removed-Abschnitte und erzeugt einen CHANGELOG.md-Diff — Übernahme erst nach [CONFIRM].
---

## Schritte

1. `git describe --tags --abbrev=0` → letzter Tag
2. `git log <tag>..HEAD --oneline` → Commit-Liste
3. Commits in Keep-a-Changelog-Buckets sortieren:
   - **Added** (feat)
   - **Changed** (refactor, perf)
   - **Fixed** (fix)
   - **Removed** (chore mit remove/delete)
   - **Security** (fix mit security/cve/vuln)
4. CHANGELOG.md-Diff zeigen — **kein automatisches Schreiben**

## Hinweise

- Merge-Commits ignorieren
- Conventional-Commit-Präfixe nutzen für Bucket-Zuordnung
- Scope in Klammern beibehalten: `Fixed (auth): ...`
