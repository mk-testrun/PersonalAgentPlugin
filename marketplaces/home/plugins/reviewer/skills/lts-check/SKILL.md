---
name: lts-check
description: >-
  Nutze um Runtimes/Frameworks (Node, Python, .NET, Go, große Libs) auf LTS-/Support-Status zu prüfen —
  Hobby-Stacks hängen oft hinter LTS. Gleicht Versionen gegen Support-Zeitpläne ab und meldet EOL-Risiken als
  findings[] (area: deps). CVEs → dependency-vuln.
---

## Scope

Versions-Lebenszyklus von Runtimes/Frameworks (Node, Python, .NET, Go, große Libs). CVEs → dependency-vuln.

## Vorgehen

1. Zielversionen aus `package.json`/`.nvmrc`, `pyproject.toml`/`.python-version`, `*.csproj`, `go.mod`, Dockerfiles lesen.
2. Gegen offizielle Support-Kalender abgleichen.

## Checkliste

1. **LTS-EOL** — Version End-of-Life (kein Security-Support). *(critical)*
2. **LTS-SOON** — EOL innerhalb 6 Monaten. *(high)*
3. **LTS-NONLTS** — Produktiv auf Nicht-LTS-Release. *(medium)*
4. **LTS-PINMISS** — Keine fixierte Runtime-Version → unkontrollierte Drift. *(medium)*
5. **LTS-TARGET** — Empfohlene LTS-Zielversion + Aufwand. *(info)*

## Output

findings[] nach `docs/findings-schema.md`, `area: deps`, ruleId aus `LTS-*`. Bei `critical`/`high`: **[GATE]**.
