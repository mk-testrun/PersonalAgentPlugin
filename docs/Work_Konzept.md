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

## Plugins (9)

| Plugin | Zweck |
|---|---|
| general | ADO-Fundament, Hooks, Policy, PII-Proxy |
| onboarding | Neue Personen einführen (≠ dokumentieren) |
| blazor | .NET/Blazor + EF-Core + Roslyn |
| testing | Test-Ausführung, Coverage, E2E (localhost) |
| review | Multi-Domain-Reviewer (read-only, inkl. dependency-vuln on-demand) |
| orchestration | Opt-in-Workflows (Feature/Bugfix/Ship) |
| doku | Confluence-Dokumentation |
| meta | Tooling über Tooling (Skill/Plugin-Author) |
| experimental | Output-Studio (Diagramme, Dashboards, Slides) |

## Sicherheitsmodell

- `preToolUse` → secret-scan **block** (2-stufig, Token-Patterns aus betterleaks.toml), tool-guardian **block**, git-guardrails **block**
- `postToolUse` → nur Audit-Eintrag (Vuln-Scans laufen on-demand über review/dependency-vuln, nicht pro Tool-Call)
- Audit-JSONL (redacted, 90-Tage-Rotation)
- ADO über `anonymizer-proxy`: PII → Pseudonyme; IBAN/Steuer-ID → fail-closed
- Playwright nur `localhost:*`
- CDN-Allowlist für Visual-Skills

## Umgebungsvariablen

Eine Quelle statt zwei driftender Tabellen: die vollständige, gepflegte Liste steht im
[Work-README](../marketplaces/work/README.md) (Abschnitt „Umgebungsvariablen“).
Konvention: Secrets nur via `${secret:NAME}`, nie in Dateien.
