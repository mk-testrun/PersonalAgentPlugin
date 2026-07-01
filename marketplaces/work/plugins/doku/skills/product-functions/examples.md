# product-functions — Worked Examples

Echte Input/Output-Paare. Verkürzt für Lesbarkeit; die Datenshapes sind aber real (das gleiche Format
das die Skripte akzeptieren / erzeugen).

## Beispiel 1 — Erst-Extraktion (leere Seite)

### Extract-Input (Modell hat ADO via `ado/*` normalisiert)

```json
{
  "project": "AcmePortal",
  "workItems": [
    {"id": 1200, "type": "Feature", "title": "Multi-Faktor-Login",
     "description": "<p>Anmeldung mit TOTP-App und Recovery-Codes.</p>",
     "acceptanceCriteria": "1. TOTP-Enrolment funktioniert. 2. Recovery-Codes einmalig gültig.",
     "state": "Active", "parentId": null,
     "url": "https://dev.azure.com/acme/_workitems/edit/1200"},
    {"id": 1201, "type": "User Story", "title": "TOTP-Enrolment",
     "state": "Closed", "parentId": 1200, "url": "…/1201"},
    {"id": 1202, "type": "User Story", "title": "Recovery-Codes generieren",
     "state": "Closed", "parentId": 1200, "url": "…/1202"},
    {"id": 1400, "type": "Task", "title": "CI-Build reparieren",
     "state": "Active", "parentId": null, "url": "…/1400"}
  ]
}
```

### Nach `extract-ado.mjs`

Task 1400 fliegt raus; 1201/1202 wandern als `sourceStories[]` unter 1200:

```json
{
  "project": "AcmePortal",
  "entries": [
    {
      "adoId": 1200, "type": "Feature", "anchor": "fn-1200",
      "slug": "multi-faktor-login", "title": "Multi-Faktor-Login",
      "state": "Active", "url": "https://dev.azure.com/acme/_workitems/edit/1200",
      "descriptionDraft": "Anmeldung mit TOTP-App und Recovery-Codes.",
      "sourceStories": [
        {"adoId": 1201, "title": "TOTP-Enrolment", "url": "…/1201", "state": "Closed"},
        {"adoId": 1202, "title": "Recovery-Codes generieren", "url": "…/1202", "state": "Closed"}
      ]
    }
  ]
}
```

### Modell verdichtet die Beschreibung (§2)

Das Modell ergänzt jedem Eintrag ein `description`-Feld (überschreibt den Draft):

```json
{
  "adoId": 1200, "anchor": "fn-1200",
  "description": "Nutzer meldet sich mit TOTP-App an und kann Recovery-Codes zur Kontowiederherstellung nutzen."
}
```

### Nach `merge-functions.mjs --mode extend` (Seite hatte nur das Template)

Der Marker-Block enthält jetzt einen Absatz mit stabilem Anker:

```xml
<ac:structured-macro ac:name="anchor" ac:schema-version="1"><ac:parameter ac:name="">ado-functions-begin</ac:parameter></ac:structured-macro>
<p>
  <ac:structured-macro ac:name="anchor" ac:schema-version="1"><ac:parameter ac:name="">fn-1200</ac:parameter></ac:structured-macro>
  <strong>Multi-Faktor-Login</strong> — Nutzer meldet sich mit TOTP-App an und kann Recovery-Codes zur Kontowiederherstellung nutzen. <a href="https://dev.azure.com/acme/_workitems/edit/1200">ADO #1200</a> <em>(basiert auf 2 Storys)</em>
</p>
<ac:structured-macro ac:name="anchor" ac:schema-version="1"><ac:parameter ac:name="">ado-functions-end</ac:parameter></ac:structured-macro>
```

### Diff-Report

```
## Summary
- ➕ added:       1
- ✅ preserved:   0
- ♻️ regenerated: 0
- ⚠️ orphaned:    0
```

---

## Beispiel 2 — Zweiter Lauf, du hast die Beschreibung nachgeschärft

Du hast in Confluence die Formulierung angepasst:

```xml
<strong>Multi-Faktor-Login</strong> — Nutzer meldet sich mit TOTP-App an, kann Recovery-Codes nutzen und ist DSGVO-konform authentifiziert.
```

Katalog unverändert. `--mode extend` erkennt anhand von `fn-1200`, dass der Eintrag existiert, und
**lässt ihn stehen**. Neu hinzugekommenes Feature `fn-1287` (Rechnungs-Export) wird angehängt.

### Diff-Report

```
## Summary
- ➕ added:       1        ← fn-1287 (Rechnungs-Export)
- ✅ preserved:   1        ← fn-1200 (deine DSGVO-Formulierung bleibt)
- ♻️ regenerated: 0
- ⚠️ orphaned:    0
```

---

## Beispiel 3 — Ein Feature wurde in ADO gelöscht

Katalog enthält `fn-1287` nicht mehr, weil das Feature in ADO als `Removed` markiert wurde. `extend`
**löscht nicht**, sondern flaggt:

```
## Summary
- ➕ added:       0
- ✅ preserved:   1
- ⚠️ orphaned:    1 (kept in page, not in ADO anymore)

## Detail
- ⚠️ fn-1287 — orphaned
```

In der Seite bleibt der Eintrag stehen, mit einem Kommentar:

```xml
<!-- orphaned: not in ADO catalog anymore; kept for manual review -->
<p>
  <ac:structured-macro ac:name="anchor" ...><ac:parameter ac:name="">fn-1287</ac:parameter>…
  <strong>Rechnungs-Export als PDF</strong> — Kunden können …
</p>
```

Du entscheidest bewusst, ob du diesen Absatz von Hand löschst — das Skript tut es nie.
