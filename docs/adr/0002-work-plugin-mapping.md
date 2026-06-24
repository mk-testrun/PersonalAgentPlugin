# ADR 0002: Work Marketplace — Plugin-Mapping

**Status:** Accepted  
**Datum:** 2026-06-23

## Kontext

Der Work-Marketplace muss einen .NET/Blazor-ADO-Workflow vollständig abdecken:
von der ersten Kommission bis zur Deployment-Pipeline.

## Plugin-Mapping

| Plugin | Verantwortungsbereich |
|---|---|
| general | ADO-CRUD, Commit, Changelog, Git-Flow, PII-Proxy, Hooks, Policy |
| onboarding | Neue Entwickler einführen (env-doctor, tour, first task) |
| blazor | Blazor-Komponenten, .NET-Conventions, EF-Core (9 Skills), sharplens |
| testing | dotnet test, coverage, E2E-Playwright (localhost only) |
| review | 18-teilige Review-Matrix: OWASP, WCAG, SQL, Deps, BFSG, Arch |
| orchestration | Opt-in-Workflows: /feature, /bugfix, /review-flow, /ship, /plan |
| doku | Confluence-Draft/Format/Publish, ADR, README, a11y-Report |
| meta | Skill/Plugin-Author, Validator, AGENTS.md-Generator, AI-Readiness |
| experimental | Diagramme, Dashboards, Slides, TTS (CDN-gesichert) |
| fun | Ralph-Wiggum (opt-in, nie in Security/Review) |

## Sicherheits-Prinzipien

- ADO läuft ausschließlich über `anonymizer-proxy` (PII-Schutz)
- Playwright beschränkt auf `localhost:*` (kein Internet)
- experimental: nur CDN-Allowlist (chart.js/gridjs/mermaid/reveal.js)
- Tool-Guardian: **block** (nicht warn)

## Konsequenzen

- `general/.mcp.json` verdrahtet ADO über `anonymizer-proxy`
- `testing/.mcp.json` und `review/.mcp.json` setzen `PLAYWRIGHT_TARGETS=http://localhost:*,https://localhost:*`
- `experimental/policy/cdn-allowlist.json` ist Pflicht
