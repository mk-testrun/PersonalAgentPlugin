---
name: changelog-generate
description: >-
  Nutze um einen Keep-a-Changelog-Eintrag seit dem letzten Git-Tag zu generieren: liest die Commit-Historie
  (git describe/log), gruppiert Conventional-Commit-Typen in Added/Changed/Fixed und erzeugt einen
  CHANGELOG.md-Diff. Kein Auto-Write — nur Vorschlag, Übernahme nach Bestätigung.
---

## Scope

Changelog-Abschnitt für ein Release aus der Commit-Historie. Kein Auto-Write — nur Vorschlag/Diff.

## Schritte

1. **Bereich bestimmen** — letzten Tag finden: `git describe --tags --abbrev=0`; Commits seither: `git log <tag>..HEAD --oneline`.
2. **Kategorisieren** — Commits in Keep-a-Changelog-Buckets einordnen (per Conventional-Commit-Type):
   - `Added` (feat) · `Changed` (refactor/perf) · `Fixed` (fix) · `Removed` · `Deprecated` · `Security`.
3. **Formatieren** — pro Bucket Bullet-Liste, menschenlesbar (nicht roher Commit-Text); Breaking Changes hervorheben.
4. **Versionskopf** — `## [<version>] - <YYYY-MM-DD>` über den Abschnitt.

## Format (Keep a Changelog)

```markdown
## [1.4.0] - 2026-06-29
### Added
- Kurze, nutzerorientierte Beschreibung
### Fixed
- …
```

## Output

Vorgeschlagener `CHANGELOG.md`-Diff (oben einfügen, unter `## [Unreleased]`). **Kein Auto-Write** — Bestätigung abwarten.
