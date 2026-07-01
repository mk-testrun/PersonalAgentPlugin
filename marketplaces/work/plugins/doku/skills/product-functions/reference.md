# product-functions — Referenz

Tiefe Details für den Skill. SKILL.md ist der Navigations-Hub; hier steht das Warum + genaue Schemata.

## §1 Extract-Schema (Input für `extract-ado.mjs`)

Modell-produzierte Normalisierung der ADO-MCP-Antwort. Ein einziges Schema, das das Skript
deterministisch weiterverarbeitet. Was **nicht** hier drin ist, wird auch nicht in den Katalog gezogen.

```json
{
  "project": "AcmePortal",
  "workItems": [
    {
      "id": 1234,
      "type": "Feature",                         // Feature | User Story (Rest wird ignoriert)
      "title": "Multi-Faktor-Login",
      "description": "…",                        // ADO System.Description (HTML zulässig, wird gestrippt)
      "acceptanceCriteria": "…",                 // optional
      "state": "Active",                          // Active | Resolved | Closed | New | Removed …
      "parentId": null,                           // null oder <number> (Feature-Parent-ID)
      "url": "https://dev.azure.com/…/1234"
    }
  ]
}
```

**Skript-Semantik:**
- **Behalten:** `type === "Feature"` (immer) · `type === "User Story"` **nur** wenn kein Feature-Parent
- **Fallenlassen:** alles andere (Task, Bug, Test Case, Removed-State bleibt aber im Katalog — der
  Merge kann den State anzeigen)
- **Gruppieren:** child User Stories eines Features → `sourceStories[]` (sortiert nach ID)
- **Sortieren:** Features zuerst (nach ID), dann orphan User Stories (nach ID) — stabile Reihenfolge

## §2 Beschreibungs-Regeln (Modell-Schritt)

`description` (1 Satz, ≤ 240 Zeichen) beschreibt **was der Nutzer damit tun kann** — nicht wie es
implementiert ist:

- ✅ „Nutzer meldet sich mit TOTP-App an und kann Recovery-Codes zur Kontowiederherstellung nutzen."
- ❌ „Feature 1234 implementiert MFA über die Auth-Bibliothek X."
- ❌ „Wir haben einen TOTP-Flow gebaut."

Regeln:
1. Ausgangsmaterial: `title` + `sourceStories[]` (Titel + State) + `descriptionDraft`. **Keine** ADO-IDs
   oder interne Team-Namen in den Fließtext.
2. Zeitform Präsens, aktiv, 2./3. Person („Nutzer kann…", nicht „User can be…").
3. Wenn `sourceStories[]` widersprüchlich sind: das **abgeschlossene** Verhalten beschreiben (`state`
   Closed/Resolved) — nicht Zukunfts-Konjunktive.
4. Bei orphan Stories reicht ein Satz aus dem Story-Titel; keine erfundenen Details ergänzen.

## §3 Marker-Konvention

**Zwei Anker-Makros** delimitieren den auto-managed Block. Confluence bewahrt diese verlässlich beim
Speichern (HTML-Kommentare werden je nach Editor gefressen):

```xml
<ac:structured-macro ac:name="anchor" ac:schema-version="1">
  <ac:parameter ac:name="">ado-functions-begin</ac:parameter>
</ac:structured-macro>

… managed …

<ac:structured-macro ac:name="anchor" ac:schema-version="1">
  <ac:parameter ac:name="">ado-functions-end</ac:parameter>
</ac:structured-macro>
```

Beide Marker fehlen → Skript exit 3 mit Hinweis auf `templates/confluence-section.xml`. Marker in
verkehrter Reihenfolge → gleicher Fehler.

## §4 Anker-ID-Stabilität (Merge-Schlüssel)

Jede Funktion trägt einen Anker `fn-<adoId>`. Der Merge matched **ausschließlich** über diesen Anker,
nie über Titel oder Slug:

- **Warum:** Titel dürfen sich in ADO ändern; wir wollen die Confluence-Formulierung nicht bei jedem
  Rename verlieren.
- **Konsequenz:** Wenn du einen Anker **händisch** aus der Seite entfernst, gilt der Eintrag beim
  nächsten Merge als „nicht vorhanden" und wird neu angelegt (Duplikat-Gefahr).
- **Never rename anchors.** Wenn ein Work Item in ADO umgezogen wird (neue ID), erscheint es als
  neuer Eintrag; den alten Eintrag manuell löschen oder als orphaned tolerieren.

## §5 Merge-Modi

| Modus | Bestehende Einträge | Fehlende Anker | Orphaned Einträge | Wann |
|---|---|---|---|---|
| `extend` (default) | preserve (Handschrift bleibt) | append neu | behalten + im Diff flaggen | Standard-Doku-Update |
| `regenerate` | überschreiben aus Katalog | append neu | behalten + im Diff flaggen | Bewusstes Neu-Aufsetzen |

`extend` löscht **nie** — auch orphan-Einträge bleiben stehen, der Nutzer entscheidet. `regenerate`
löscht ebenfalls nichts (respekt orphan) — es überschreibt nur die Beschreibung dort, wo Anker im
Katalog vorkommen.

## §6 Was das Skript **nicht** tut

- Kein HTTP-Call gegen ADO oder Confluence — das macht das Modell via MCP. Skripte sind
  netzwerklos und deterministisch (dependency-free Node ESM).
- Kein automatisches Publish. `state/artifacts/functions-page-<page>.new.xml` ist ein **Draft**;
  Publish ist ein separater `confluence/*`-Aufruf hinter [CONFIRM].
- Keine Löschung von orphan-Einträgen. Löschen ist eine bewusste Nutzer-Entscheidung, nie ein Skript-
  Nebeneffekt.

## §7 Sicherheit / PII

- ADO-Calls laufen durch **anonymizer-proxy** (siehe `general/.mcp.json` / doku-`ado`-Eintrag).
- Confluence-Space-Allowlist über `${env:CONFLUENCE_SPACES}` erzwungen.
- Publish-Gate: `[CONFIRM]` vor jedem Page-Update — matcht documenter-Agent-Policy.
