# devops-safe — Azure-DevOps-Extension für die GitHub Copilot CLI

Lokaler MCP-Server (Node ≥ 20, keine Dependencies): `node src/server.mjs`
Konfiguration über Env `AGENT_CONFIG` → `companies.json` (siehe `../config/companies.example.json`).

## Garantien

- **Projekt-Whitelist:** Nur Projekte aus `whitelistedProjects` sind les- und schreibbar; Abfrage-Ergebnisse werden zusätzlich hart nachgefiltert.
- **Lesen erlaubt:** Alle Work-Item-Typen (User Story, Bug, Epic, Feature, …) innerhalb der Whitelist.
- **Bearbeiten nur eigener Items:** Vor jedem Update wird `System.AssignedTo` gegen die konfigurierte `userEmail` geprüft.
- **Löschen unmöglich:** Kein Delete-Tool; Soft-Delete via `System.State = "Removed"` ist blockiert; gesperrte Felder (`System.TeamProject`, `System.CreatedBy`, …) sind unveränderbar.
- **AI-Tagging:** Neu erstellte Items → Tag `AI-Generated`, bearbeitete Items → Tag `AI-Edited`.
- **Multi-Company/-Tenant:** Jedes Tool akzeptiert `company`/`tenant`; bei Eindeutigkeit optional.
- **Abfrage-Tool:** `devops_query_work_items` mit Filtern oder eigener WIQL (nur einzelnes `SELECT`).
- **Optionale PII-Redaction:** siehe `../README.md`, Schritt 3.

## Tools

| Tool | Zweck |
| --- | --- |
| `devops_list_tenants` | Konfigurierte Firmen/Tenants + Whitelists (ohne Secrets) |
| `devops_list_projects` | Erreichbare (gewhitelistete) Projekte |
| `devops_get_work_item` | Einzelnes Work Item lesen |
| `devops_query_work_items` | Abfrage per Filter oder WIQL-SELECT |
| `devops_create_work_item` | Item erstellen (AI-Tag, Default: mir zugewiesen) |
| `devops_update_work_item` | Item ändern — nur wenn mir zugeordnet |
| `devops_whoami` | Zeigt die aktive Assigned-to-me-Identität je Tenant |

## Test

```bash
npm test
```
