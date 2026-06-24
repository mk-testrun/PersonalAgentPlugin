---
description: Keep-a-Changelog-Eintrag seit letztem Git-Tag generieren.
---

Nutze den Skill changelog-generate:
- Ermittle letzten Tag via `git describe --tags --abbrev=0`
- Lese Git-Log seit diesem Tag
- Sortiere in Keep-a-Changelog-Buckets: Added/Changed/Fixed/Removed/Security
- Zeige den Diff für CHANGELOG.md — schreibe **nicht** automatisch
