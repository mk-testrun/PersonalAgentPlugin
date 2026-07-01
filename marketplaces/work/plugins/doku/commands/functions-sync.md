---
description: Confluence-Funktionsliste einer Projekt-Seite aus ADO ableiten oder erweitern (extend-Merge, [CONFIRM] vor Publish).
---
**Usage:** `/functions-sync <projekt> <confluence-page-id-or-title> [--mode extend|regenerate]`

Nutze den `product-functions`-Skill mit folgendem 5-Schritt-Flow und den vom Nutzer übergebenen Argumenten:

1. **Extract** — via `ado/*` Features + orphan User Stories des angegebenen `<projekt>` (optional area path/iteration filter aus dem Kontext ableiten) holen, auf das Extract-Schema normalisieren, dann `scripts/extract-ado.mjs` ausführen → `state/artifacts/functions-catalog-<projekt>.json`.
2. **Verdichten** — für jeden Katalog-Eintrag eine 1-Satz Nutzer-Beschreibung schreiben (Titel + `sourceStories[]` als Basis, Regeln siehe reference.md §2). `description` überschreibt `descriptionDraft`.
3. **Setup-Check** — die Ziel-Confluence-Seite via `confluence/*` lesen. Falls die zwei Anker-Makros (`ado-functions-begin` / `-end`) fehlen: `templates/confluence-section.xml` einmal einfügen und die Nutzer darüber informieren.
4. **Merge-Preview** — `scripts/merge-functions.mjs --mode <extend|regenerate>` gegen Katalog + Seitenkopie ausführen, Diff-Report schreiben → `state/artifacts/functions-diff-<page>.md`. Default `extend`.
5. **[CONFIRM] & Publish** — Diff-Report zeigen (added / preserved / orphaned). Nur nach expliziter Bestätigung: die Seite via `confluence/*` updaten (respekt `${env:CONFLUENCE_SPACES}`).

Wenn `<projekt>` fehlt: aus `${env:ADO_PROJECT}` ableiten. Wenn `<confluence-page-id-or-title>` fehlt: `/story`- oder Repo-Kontext befragen, keine Seiten raten.
