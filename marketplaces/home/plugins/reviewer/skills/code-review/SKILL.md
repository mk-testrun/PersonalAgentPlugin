---
name: code-review
description: Nutze wenn Code auf allgemeine Qualität zu prüfen ist — SOLID, DRY, Lesbarkeit, Naming, Fehlerbehandlung. Sprachneutral.
---

## Scope

Allgemeine Code-Qualität, sprach- und framework-neutral (Multi-Lang). **Nicht** hier:
Security (→ security-review), Performance (→ performance-review).

## Checkliste

1. **CR-RESP** — Eine Verantwortung pro Funktion/Klasse/Modul; keine God-Objects. *(medium)*
2. **CR-DRY** — Duplizierte Logik (≥3 Vorkommen) extrahieren; Copy-Paste markieren. *(low/medium)*
3. **CR-NAMING** — Sprechende Namen; Bool-Prädikate `is/has/can`; keine kryptischen Abkürzungen. *(low)*
4. **CR-FUNCLEN** — Funktionen > ~40 Zeilen oder Komplexität > 10 → aufteilen. *(medium)*
5. **CR-NESTING** — Verschachtelung > 3 Ebenen → Guard-Clauses / Early-Return. *(low)*
6. **CR-ERRORS** — Keine verschluckten Fehler/leeren `catch`; Fehler geloggt oder propagiert. *(high)*
7. **CR-NULL** — Null/None/undefined-Pfade abgesichert; keine offensichtlichen NPE/TypeErrors. *(medium)*
8. **CR-MAGIC** — Magic Numbers/Strings → benannte Konstanten/Enums. *(low)*
9. **CR-COMMENT** — Kommentare erklären *warum*; kein auskommentierter Code. *(low)*
10. **CR-DEADCODE** — Ungenutzte Importe/Variablen/Funktionen entfernen. *(low)*

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `CR-*`. Bei `critical`/`high`: **[GATE]**.
