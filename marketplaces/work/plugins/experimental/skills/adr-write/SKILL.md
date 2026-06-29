---
name: adr-write
description: Nutze wenn ein Architecture Decision Record geschrieben werden soll.
---

## Format

```markdown
# ADR NNNN: Titel

**Status:** Proposed | Accepted | Deprecated
**Datum:** YYYY-MM-DD

## Kontext
[Problem-Beschreibung]

## Entscheidung
[Was wird entschieden]

## Begründung
[Warum diese Entscheidung]

## Konsequenzen
[Was ändert sich, was bleibt offen]
```

Speicherpfad: `docs/adr/NNNN-<slug>.md`
Nummerierung automatisch aus vorhandenen ADRs ermitteln.

ADRs sind **versionierte Repo-Artefakte** — sie leben neben dem Code, nicht im Wiki.
Kein Confluence-Publish. Für Folge-Slides: `presentation-from-adr`.
