---
name: product-functions
description: >-
  Nutze wenn du in Confluence eine „Funktionen"-Sektion aus Azure DevOps ableiten oder inkrementell
  erweitern willst. Zieht Features + waisenlose User Stories aus ADO (via `ado/*` MCP), erzeugt einen
  stabilen Funktionskatalog mit permanenten Ankern (`fn-<adoId>`), und merged nur den markierten Block
  in die Confluence-Seite (via `confluence/*` MCP). Standard-Modus `extend`: neue Funktionen werden
  ergänzt, existierende (auch handverfeinerte) Beschreibungen bleiben unangetastet — `regenerate` nur
  auf explizite Anweisung. Publish ist immer hinter [CONFIRM].
---

# product-functions

Aus ADO-Anforderungen einen wartbaren „Funktionen"-Abschnitt in Confluence ableiten — inkrementell,
idempotent, ohne deine Handschrift zu überschreiben.

## When to Use This Skill

- „Funktionen-Liste aus ADO nach Confluence bringen" · „Confluence-Funktionen aus DevOps aktualisieren"
- Onboarding-/Produkt-Seiten, auf denen die Funktionsübersicht mit dem Backlog wachsen soll
- Nach einer Sprint-Abnahme: neu abgenommene Features in die Projekt-Doku ergänzen

## Scope

- **In:** Features (jeder State) + orphan User Stories (kein Feature-Parent). Child-Stories werden als
  `sourceStories[]` an ihr Feature gehängt und reichern die Beschreibung an — ein Feature-Titel allein
  wäre zu dünn.
- **Out:** Tasks, Bugs, Test Cases. ADRs → `experimental/adr-write`. Frei-Prosa → `confluence-draft`.

## Workflow

### Step 1 — Extract (deterministisch)
Query per Area-Path/Iteration/State über den ADO-MCP, dann Model-Normalisierung → Skript:

```bash
# 1a) Modell holt Work Items via ado/* MCP und normalisiert auf das Extract-Schema (siehe reference.md §1)
#     → state/artifacts/functions-ado-<project>.json
# 1b) deterministische Katalog-Erzeugung:
node scripts/extract-ado.mjs state/artifacts/functions-ado-<project>.json \
  > state/artifacts/functions-catalog-<project>.json
```
Der Katalog trägt `adoId`, `type`, `anchor` (`fn-<id>`, dauerhaft stabil), `slug`, `title`, `state`, `url`,
`descriptionDraft` (Regel-basiert), `sourceStories[]`.

### Step 2 — Beschreibungen verdichten (Modell)
Für **jede** Katalog-Eintragung: das Modell schreibt eine **1-Satz** Nutzer-Beschreibung als `description`
(überschreibt `descriptionDraft`). Basis: Titel + `sourceStories[]` (Titel + State). Regeln in
`reference.md §2` (was rein darf, was nicht).

### Step 3 — Marker-Block in Confluence einrichten (einmalig)
Wenn die Zielseite noch keinen Block hat: `templates/confluence-section.xml` in die Seite einfügen. Die
zwei Anker-Makros (`ado-functions-begin` / `-end`) sind Pflicht — dazwischen managed das Skript.

### Step 4 — Merge-Preview (extend, deterministisch)
```bash
# 4a) Modell zieht die aktuelle Seite via confluence/* MCP → page.xml (Storage-Format)
# 4b) deterministisches Merge:
node scripts/merge-functions.mjs \
  --catalog state/artifacts/functions-catalog-<project>.json \
  --page   state/artifacts/functions-page-<page>.xml \
  --diff   state/artifacts/functions-diff-<page>.md \
  > state/artifacts/functions-page-<page>.new.xml
```
Standard `--mode extend`: neue Anker anhängen · bestehende Einträge (mit deiner Handschrift) bleiben ·
Anker, die nicht mehr im Katalog sind, werden als **orphaned** markiert (nie gelöscht).
`--mode regenerate` nur wenn du das explizit willst.

### Step 5 — [CONFIRM] & Publish
`state/artifacts/functions-diff-<page>.md` dem Nutzer zeigen. Nur nach **[CONFIRM]**: Seite via
`confluence/*` MCP updaten (respekt `${env:CONFLUENCE_SPACES}`).

## Output

- `state/artifacts/functions-catalog-<project>.json` — normalisierter Funktionskatalog
- `state/artifacts/functions-page-<page>.new.xml` — Confluence Storage-Format mit gemergtem Block
- `state/artifacts/functions-diff-<page>.md` — human-lesbarer Merge-Report (added/preserved/orphaned)

Tief: siehe [`reference.md`](reference.md) (Schema, Marker-Konvention, ID-Stabilität, Storage-Format).
Beispiele: [`examples.md`](examples.md).
