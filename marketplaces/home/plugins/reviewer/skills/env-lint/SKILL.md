---
name: env-lint
description: Nutze proaktiv beim Prüfen von Umgebungskonfigurationen — toleranter: echte .env OK, solange nicht committed.
---

## Scope

Env-/Konfig-Dateien, Multi-Lang. Tolerant: eine lokale `.env` mit echten Werten ist OK —
**solange sie nicht eingecheckt** ist.

## Checkliste

1. **ENV-COMMITTED** — Echte `.env` mit Secrets im Git-Index/History → entfernen + `.gitignore`. *(critical)*
2. **ENV-EXAMPLE** — `.env.example` enthält nur Platzhalter, keine echten Werte. *(high)*
3. **ENV-CONSISTENCY** — Schlüssel zwischen `.env.example` und Code/Doku konsistent benannt. *(medium)*
4. **ENV-MISSING** — Vom Code referenzierte Variablen fehlen in `.env.example`. *(medium)*
5. **ENV-SECRETMARK** — Token-/Key-artige Schlüssel (`*_TOKEN/_KEY/_SECRET/_PASSWORD`) als Secret behandelt. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: env`, ruleId aus `ENV-*`. Bei `critical`/`high`: **[GATE]**.
