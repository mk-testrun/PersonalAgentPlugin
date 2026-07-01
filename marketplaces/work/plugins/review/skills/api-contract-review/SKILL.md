---
name: api-contract-review
description: Nutze für OpenAPI/Swagger- und REST-Vertrag-Prüfung — Breaking Changes, Versionierung, Nullability, Status-Codes.
---

## Scope

API-Verträge (OpenAPI/Swagger, Controller-Signaturen). Bei Diff gegen vorige Spec: Breaking-Change-Fokus.

## Checkliste

1. **API-BREAK** — Entferntes/umbenanntes Feld, geänderter Typ, neuer Pflicht-Parameter, entfernter Endpoint = Breaking ohne Version. *(critical)*
2. **API-VERSION** — Versionierung vorhanden (Pfad/Header); Breaking nur in neuer Major. *(high)*
3. **API-STATUS** — Korrekte Status-Codes (201/204/400/401/403/404/409/422); kein 200 für Fehler. *(medium)*
4. **API-NULL** — `required`/Nullability konsistent zwischen Spec und Implementierung. *(medium)*
5. **API-ERRORS** — Einheitliches Fehlerschema (z.B. ProblemDetails); dokumentierte Fehlerantworten. *(medium)*
6. **API-NAMING** — Konsistente Ressourcen-/Feld-Konventionen (Plural, casing); idempotente Verben korrekt. *(low)*
7. **API-PAGING** — Listen-Endpoints paginiert und dokumentiert. *(low)*
8. **API-AUTH** — Security-Scheme je Endpoint dokumentiert; geschützte Routen nicht als öffentlich spezifiziert. *(high)*

## Output

findings[] nach `docs/findings-schema.md`, `area: design`, ruleId aus `API-*`. Bei `critical`/`high`: **[GATE]**.
