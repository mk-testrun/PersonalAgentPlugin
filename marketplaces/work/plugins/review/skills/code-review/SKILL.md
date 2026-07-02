---
name: code-review
description: >-
  Nutze wenn Code auf allgemeine Qualität zu prüfen ist — SOLID, DRY, Lesbarkeit, Naming, Fehlerbehandlung,
  tote Pfade. Sprachneutral, rein statisch. Liefert findings[] (area: design) mit Fundort + konkretem Fix.
  Nicht hier: Security → security-review, Performance → performance-review, Tests → tests-review.
---

## Scope

Allgemeine Code-Qualität, sprachneutral. **Nicht** hier: Security (→ security-review),
Performance (→ performance-review), Tests (→ testing/tests-review). Reine Quelltext-Analyse.

## Checkliste

1. **CR-SOLID** — Eine Verantwortung pro Klasse/Methode; keine God-Objects; Abhängigkeiten injiziert statt `new`. *(medium)*
2. **CR-DRY** — Duplizierte Logik (≥3 Vorkommen) extrahieren; Copy-Paste-Blöcke markieren. *(low/medium)*
3. **CR-NAMING** — Sprechende Namen; keine Abkürzungen ohne Konvention; Bool-Methoden `Is/Has/Can`. *(low)*
4. **CR-FUNCLEN** — Methoden > ~40 Zeilen oder zyklomatische Komplexität > 10 → aufteilen. *(medium)*
5. **CR-NESTING** — Verschachtelung > 3 Ebenen → Guard-Clauses / Early-Return. *(low)*
6. **CR-ERRORS** — Keine leeren `catch`; keine verschluckten Exceptions; kein `catch(Exception)` ohne Rethrow/Log. *(high)*
7. **CR-NULL** — Nullability beachtet (`?`/`required`); keine offensichtlichen NRE-Pfade. *(medium)*
8. **CR-MAGIC** — Magic Numbers/Strings → benannte Konstanten/Enums. *(low)*
9. **CR-COMMENT** — Kommentare erklären *warum*, nicht *was*; kein auskommentierter Code. *(low)*
10. **CR-DEADCODE** — Ungenutzte Felder/Methoden/Usings entfernen. *(low)*

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `CR-*`. Bei `critical`/`high`: **[GATE]**.
