# ADR-0002 — Work-Marketplace: Plugin-Mapping

## Status
Accepted · 2026-06-23 · Aktualisiert 2026-07-02 (loop→experimental, fun entfernt) · Ersetzt durch: —

## Kontext
Der Work-Marketplace muss einen .NET/Blazor-ADO-Workflow abdecken — von der ersten Kommission bis zur
Deployment-Pipeline. Die Frage: wie schneidet man die Fähigkeiten in Plugins, ohne dass ein Plugin zum
Grabbelkasten wird oder Fähigkeiten über mehrere Plugins zersplittern?

## Optionen
- **A — Wenige große Plugins** (z. B. „dev", „ops", „docs"): einfache Installation, aber jedes Plugin
  wird eine Grabbelkiste, Discovery leidet.
- **B — Ein Plugin pro Skill:** maximale Granularität, aber Dutzende Plugins, unübersichtliche
  Marketplace-Liste, viel Manifest-Overhead.
- **C — Plugins entlang Verantwortungsbereichen** (Fundament, Stack, Test, Review, Doku, Meta, …): ein
  Plugin = eine kohärente Rolle im Workflow.

## Entscheidung
**Option C — 9 Plugins:**

| Plugin | Verantwortungsbereich |
|---|---|
| general | ADO-CRUD, Commit, Changelog, Git-Flow, PII-Proxy, Hooks, Policy, Story/Grill/TDD/Triage |
| onboarding | Neue Entwickler einführen (Initiator + Tracks: Tool/Marketplace/Projekt) |
| blazor | Blazor-Komponenten, .NET-Conventions, EF-Core, sharplens (Roslyn) |
| testing | dotnet test, Coverage-Gates, E2E-Playwright (localhost only) |
| review | Multi-Domain-Review-Matrix: OWASP, WCAG, BFSG, SQL, Deps, Performance, Pipelines |
| orchestration | Opt-in-Workflows: /feature, /bugfix, /review-flow, /ship, /plan |
| doku | Confluence-Draft/Format/Publish, Code→Doc, README, **product-functions** (Funktionskatalog aus ADO) |
| meta | Skill/Plugin/Agent/Command/MCP-Author, Validator, AI-Readiness; dotnet-Starter-Template |
| experimental | Diagramme, Dashboards, Slides, TTS, **Agent-Loop** (CDN-gesichert) |

## Sicherheits-Prinzipien
- ADO läuft ausschließlich über `anonymizer-proxy` (PII-Schutz).
- Playwright beschränkt auf `localhost:*` (kein Internet).
- experimental: nur CDN-Allowlist (chart.js/gridjs/mermaid/reveal.js).
- Tool-Guardian: **block** (nicht warn); Git-Guardrails **block** (ADR-0004).

## Konsequenzen
- **Positiv:** jede Rolle im Dev-Workflow hat genau ein zuständiges Plugin; Delegation ist eindeutig.
- **Änderungen ggü. v1:** `loop` (früher eigenes Plugin) ist jetzt in `experimental`; das `fun`-Plugin
  (Ralph-Wiggum) wurde entfernt (kein Mehrwert, Ablenkung in einem block-Kontext).
- **Kosten:** `experimental` trägt mit 18+ Skills viel — Kandidat für späteren Split (siehe Offene Fragen).
- Wiring: `general/.mcp.json` verdrahtet ADO über `anonymizer-proxy`; `testing`/`review` setzen
  `PLAYWRIGHT_TARGETS=…localhost…`; `experimental/policy/cdn-allowlist.json` ist Pflicht.

## Offene Fragen
- `experimental` ist groß (Output-Studio + loop). Split in „visualize" und „authoring-extras", sobald es
  unübersichtlich wird?
