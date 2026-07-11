# confluence-drafts — Confluence-Extension für die GitHub Copilot CLI

Lokaler MCP-Server (Node ≥ 20, keine Dependencies): `node src/server.mjs`
Konfiguration über Env `AGENT_CONFIG` → `companies.json` (siehe `../config/companies.example.json`).
Gebaut für Confluence Cloud (v2-API + v1-Suche, Basic-Auth mit API-Token).

## Garantien

- **Space-Whitelist:** Nur Spaces aus `whitelistedSpaces` sind les- und schreibbar; Seiten werden über ihre `spaceId` gegen die aufgelöste Whitelist geprüft.
- **Kein Publish — immer Entwurf:** Neue Seiten entstehen ausschließlich mit `status: "draft"`; aktualisiert werden dürfen nur Seiten, die bereits Draft sind. Der HTTP-Client besitzt keinerlei Publish- oder Delete-Methode, und der Choke-Point `assertDraftPayload` blockiert jede Schreib-Payload ohne `status: "draft"`. Veröffentlicht wird nur manuell durch den Menschen.
- **Suche eingeschränkt:** Jede CQL wird automatisch mit `AND space in (<Whitelist>)` verknüpft.
- **Multi-Company/-Tenant:** Jedes Tool akzeptiert `company`/`tenant`; bei Eindeutigkeit optional.
- **Optionale PII-Redaction:** siehe `../README.md`, Schritt 3.

## Tools

| Tool | Zweck |
| --- | --- |
| `confluence_list_tenants` | Konfigurierte Firmen/Tenants + Whitelists (ohne Secrets) |
| `confluence_list_spaces` | Erreichbare (gewhitelistete) Spaces |
| `confluence_get_page` | Seite inkl. Storage-Body lesen |
| `confluence_search` | CQL-/Freitextsuche, hart auf Whitelist-Spaces begrenzt |
| `confluence_create_draft` | Neue Seite als Entwurf anlegen |
| `confluence_update_draft` | Bestehenden Entwurf ändern (nie publishen) |

## Test

```bash
npm test
```
