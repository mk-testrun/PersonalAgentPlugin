# Test — Sichere Copilot-CLI-Extensions (DevOps + Confluence)

Zwei lokale Node-Extensions (MCP-Server, dependency-frei, Node ≥ 20) für die GitHub Copilot CLI,
plus optionale PII-Redaction. Multi-Company und Multi-Tenant sind fest eingebaut.

```
Test/
├── shared/                      # Gemeinsame Bausteine
│   ├── mcp-server.mjs           # Minimaler MCP-stdio-Server (JSON-RPC 2.0)
│   ├── config.mjs               # Multi-Company/-Tenant-Konfiguration + Secrets aus Env
│   ├── pii-filter.mjs           # Schritt 3: optionale PII-Redaction
│   ├── errors.mjs               # PolicyError → "POLICY BLOCKED"-Tool-Ergebnis
│   └── test/                    # Unit-Tests der Bausteine
├── devops-extension/            # Schritt 1: devops-safe (Azure DevOps)
├── confluence-extension/        # Schritt 2: confluence-drafts (Confluence Cloud)
├── config/companies.example.json      # Konfigurations-Vorlage
└── copilot-mcp-config.example.json    # Vorlage für ~/.copilot/mcp-config.json
```

## Schritt 1 — `devops-safe` (Azure DevOps)

| Regel | Umsetzung |
| --- | --- |
| Nur gewhitelistete Projekte | `whitelistedProjects` je Tenant; geprüft vor jedem Lese-/Schreibzugriff, Abfrage-Ergebnisse werden zusätzlich hart nachgefiltert |
| Lesen aller Stories/Bugs/Epics/Features | `devops_get_work_item` + `devops_query_work_items` lesen jeden Typ (innerhalb der Whitelist) |
| Bearbeiten nur eigener Items | Vor jedem Update wird das Item geladen und `System.AssignedTo` gegen `userEmail` geprüft |
| Löschen unmöglich | Es existiert kein Delete-Tool, und der Soft-Delete (`System.State = "Removed"`) wird blockiert |
| Extra Abfrage-Tool | `devops_query_work_items`: Filter oder eigene WIQL (nur einzelnes `SELECT`) |
| AI-Tagging | Erstellte Items erhalten `AI-Generated`, bearbeitete `AI-Edited` (automatisch, Duplikate vermieden) |
| Multi-Company / Multi-Tenant | Parameter `company` + `tenant` an jedem Tool; bei Eindeutigkeit optional |

Tools: `devops_list_tenants`, `devops_list_projects`, `devops_get_work_item`,
`devops_query_work_items`, `devops_create_work_item`, `devops_update_work_item`, `devops_whoami`.

Weitere Schutzmechanismen: gesperrte Felder (`System.TeamProject`, `System.CreatedBy`, …),
optimistische Sperre über `rev` beim Update, WIQL-Escaping, PAT nur aus Env-Variablen.

## Schritt 2 — `confluence-drafts` (Confluence Cloud)

| Regel | Umsetzung |
| --- | --- |
| Nur gewhitelistete Spaces | `whitelistedSpaces` je Tenant; Seiten werden über ihre `spaceId` gegen die aufgelöste Whitelist geprüft |
| Kein Publish, immer Entwurf | Neue Seiten entstehen mit `status: "draft"`; aktualisiert werden dürfen nur Seiten, die bereits Draft sind. Der Client hat keinerlei Publish-/Delete-Methode, und ein Choke-Point (`assertDraftPayload`) blockiert jede Schreib-Payload ohne `status: "draft"` |
| Suche eingeschränkt | Jede CQL wird mit `AND space in (<Whitelist>)` verknüpft — auch eigene CQL kann nicht ausbrechen |

Tools: `confluence_list_tenants`, `confluence_list_spaces`, `confluence_get_page`,
`confluence_search`, `confluence_create_draft`, `confluence_update_draft`.
Veröffentlicht wird ausschließlich manuell durch den Menschen im Browser.

## Schritt 3 — Optionale PII-Redaction

`shared/pii-filter.mjs` redigiert Tool-Ausgaben, bevor sie an die KI gehen:

- Felder, die eindeutig Benutzer identifizieren (`System.AssignedTo`, `createdBy`,
  `displayName`, `emailAddress`, `authorId`, `accountId`, …) → `[PII-REDACTED]`
- E-Mail-Adressen in beliebigem Freitext → `[EMAIL-REDACTED]`

Aktivierung (Default: **aus**):

```jsonc
// companies.json
"pii": { "enabled": true, "extraUserFields": ["Custom_Reviewer"] }
```

oder per Env-Override `PII_REDACTION=on` / `off` (gewinnt gegenüber der Konfiguration).

## Konfiguration (Multi-Company / Multi-Tenant)

`config/companies.example.json` nach `config/companies.json` kopieren und anpassen.
Secrets (PATs, API-Tokens) stehen **nie** in der Datei — dort steht nur der Name der
Env-Variable (`patEnv` / `apiTokenEnv`), die den Wert liefert.

## Einbindung in die GitHub Copilot CLI

`copilot-mcp-config.example.json` in `~/.copilot/mcp-config.json` übernehmen (Pfade anpassen)
oder interaktiv über `/mcp add` in der Copilot CLI registrieren. Beide Server sprechen
stdio-MCP und brauchen nur `node` — kein `npm install` nötig.

```bash
# Secrets bereitstellen (Namen wie in companies.json)
export ADO_PAT_ACME_MAIN="..."
export CONFLUENCE_TOKEN_ACME="..."
```

## Tests

```bash
cd Test
npm test        # 38 Tests: Guards, PII-Filter, Konfiguration, MCP-Protokoll, stdio-Smoke-Tests
```

Die Smoke-Tests starten beide Server real über stdio und verifizieren u. a., dass
**kein** Delete-/Publish-Tool existiert und Whitelist-Verstöße als `POLICY BLOCKED`
gemeldet werden, ohne dass ein Netzwerkzugriff stattfindet.
