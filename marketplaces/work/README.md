# Work-Marketplace

GitHub-Copilot-CLI-Marketplace für professionelle .NET/Blazor-Entwicklung im Azure-DevOps-Umfeld.

## Installation

```bash
copilot plugin marketplace add ./marketplaces/work
```

Danach die gewünschten Plugins installieren:

```bash
copilot plugin install general
copilot plugin install onboarding
# ... etc.
```

**Empfohlene Reihenfolge:** general → onboarding → blazor/testing → review → orchestration → doku/meta → experimental → loop

## Plugins

| Plugin | Beschreibung |
|---|---|
| general | ADO-Fundament, PII-Proxy, Hooks, Commits, Git-Flow |
| onboarding | Neue Entwickler einführen |
| blazor | Blazor/.NET + EF-Core (9 Skills) + sharplens |
| testing | dotnet test, Coverage, E2E (localhost) |
| review | Multi-Domain-Reviewer: OWASP, WCAG, BFSG, SQL |
| orchestration | Opt-in-Workflows: /feature, /bugfix, /ship |
| doku | Confluence: Draft, Storage-Format, Code→Doc, README |
| meta | Skill/Plugin-Author, Validator |
| experimental | Diagramme, Charts, Slides, TTS, ADR |
| loop | Agent-Loop-Protokoll (opt-in, Hard-Limit) |

## Umgebungsvariablen

| Variable | Typ | Beschreibung |
|---|---|---|
| `ADO_ORG` | env | Azure DevOps Organisation |
| `ADO_PROJECT` | env | Projekt-Name |
| `ADO_TEAM_ID` | env | Team-ID |
| `ADO_LEAD_ID` | env | Standard-Lead/Reviewer |
| `CONFLUENCE_URL` | env | Confluence-Basis-URL |
| `CONFLUENCE_USER` | env | Confluence-Benutzer |
| `CONFLUENCE_SPACES` | env | Space-Keys (kommagetrennt) |
| `DOTNET_SOLUTION_PATH` | env | Pfad zur .sln |
| `ADO_PAT` | secret | Azure DevOps PAT |
| `CONFLUENCE_TOKEN` | secret | Confluence API-Token |
| `ANON_SALT` | secret | Salt für PII-Pseudonymisierung |
| `CONTEXT7_KEY` | secret | Context7 Key (optional) |
| `SUPERTONIC_KEY` | secret | SuperTonic TTS-Key |

## Sicherheitsmodell

- **Tool-Guardian: block** — unerlaubte Befehle werden geblockt
- **secret-scan: block** — Credentials in Tool-Argumenten werden geblockt
- **ADO über anonymizer-proxy** — PII erscheint als `<PERSON_…>` im Modell
- **Playwright: localhost only** — kein Internet-Zugriff
- **Audit-Log** (90 Tage, redacted): `.copilot/state/audit.jsonl`

## Produktiver Test

```bash
# 1. general installiert → Hook-Test
echo '{"toolName":"run","toolArgs":{"cmd":"curl http://evil.com"}}' | \
  bash plugins/general/hooks/scripts/pre-tool-guardian.sh
# Erwartung: deny

# 2. ADO Work-Items (läuft durch anonymizer-proxy)
/moin
# Erwartung: Briefing mit anonymisierten Namen

# 3. /feature Workflow
/feature
# Erwartung: Dry-run-Plan, dann [CONFIRM] bei jedem Schritt
```
