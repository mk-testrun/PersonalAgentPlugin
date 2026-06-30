# Work-Marketplace — Konzept

## Zielbild

Der Work-Marketplace ist das abgesicherte Copilot-Erweiterungspaket für professionelle
.NET/Blazor-Entwicklung in einem Azure-DevOps-Umfeld. Alle Aktionen sind revisionierbar,
PII wird anonymisiert, Secrets verlassen nie das Modell.

## Charakter

- **Sicherheit first:** Tool-Guardian blockt unerlaubte Befehle, betterleaks/kingfisher scannen Secrets
- **ADO-zentriert:** Work-Items, PRs, Builds, Pipelines über `@azure-devops/mcp` (hinter anonymizer-proxy)
- **Blazor/.NET-Stack:** sharplens (Roslyn), EF-Core, Testcontainers, xUnit, Playwright (localhost-only)
- **Review-Matrix:** OWASP ASVS L2, WCAG 2.2, BFSG, Performance, SQL, Licenses, Pipelines
- **Keine Cloud-Bild-Generierung** im experimental-Plugin

## Plugins (10)

| Plugin | Zweck |
|---|---|
| general | ADO-Fundament, Hooks, Policy, PII-Proxy |
| onboarding | Neue Personen einführen (≠ dokumentieren) |
| blazor | .NET/Blazor + EF-Core + Roslyn |
| testing | Test-Ausführung, Coverage, E2E (localhost) |
| review | Multi-Domain-Reviewer (read-only) |
| orchestration | Opt-in-Workflows (Feature/Bugfix/Ship) |
| doku | Confluence-Dokumentation |
| meta | Tooling über Tooling (Skill/Plugin-Author) |
| experimental | Output-Studio (Diagramme, Dashboards, Slides) |
| fun | Ralph-Wiggum (opt-in) |

## Sicherheitsmodell

- `preToolUse` → secret-scan **block**, tool-guardian **block**, vuln-scan **warn**
- Audit-JSONL (redacted, 90-Tage-Rotation)
- ADO über `anonymizer-proxy`: PII → Pseudonyme; IBAN/Steuer-ID → fail-closed
- Playwright nur `localhost:*`
- CDN-Allowlist für Visual-Skills

## Umgebungsvariablen (erforderlich)

| Variable | Typ | Beschreibung |
|---|---|---|
| `ADO_ORG` | env | Azure DevOps Organisation |
| `ADO_PROJECT` | env | Projekt-Name |
| `ADO_TEAM_ID` | env | Team-ID für Work-Items |
| `ADO_LEAD_ID` | env | Standard-Lead/Reviewer |
| `CONFLUENCE_URL` | env | Confluence-Basis-URL |
| `CONFLUENCE_USER` | env | Confluence-Benutzer |
| `CONFLUENCE_SPACES` | env | Erlaubte Space-Keys (kommagetrennt) |
| `DOTNET_SOLUTION_PATH` | env | Pfad zur .sln-Datei |
| `ADO_PAT` | secret | Azure DevOps Personal Access Token |
| `CONFLUENCE_TOKEN` | secret | Confluence API-Token |
| `CONTEXT7_KEY` | secret | Context7 API-Key (optional) |
| `SUPERTONIC_KEY` | secret | SuperTonic TTS API-Key |
