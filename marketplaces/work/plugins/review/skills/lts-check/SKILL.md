---
name: lts-check
description: Nutze um Frameworks/Laufzeiten auf LTS-/Support-Status zu prüfen (EOL-Risiko).
---

## Scope

Versions-Lebenszyklus von Runtimes/Frameworks (.NET, Node, DB-Treiber, große Libs).
Bekannte CVEs → dependency-vuln; Lizenzen → license-check.

## Vorgehen

1. Zielversionen aus `*.csproj` (`TargetFramework`), `global.json`, `package.json`, Dockerfiles lesen.
2. Gegen offizielle Support-Kalender abgleichen (z.B. .NET: nur gerade Majors sind LTS).

## Checkliste

1. **LTS-EOL** — Version bereits **End-of-Life** (kein Security-Support mehr). *(critical)*
2. **LTS-SOON** — EOL innerhalb 6 Monaten → Upgrade einplanen. *(high)*
3. **LTS-NONLTS** — Produktiv auf Nicht-LTS/STS-Release statt LTS. *(medium)*
4. **LTS-PINMISS** — Keine fixierte Runtime (`global.json`) → unkontrollierte Drift. *(medium)*
5. **LTS-TARGET** — Empfohlene LTS-Zielversion + Migrationsaufwand-Hinweis. *(info)*

## Output

findings[] nach `docs/findings-schema.md`, `area: deps`, ruleId aus `LTS-*`. Bei `critical`/`high`: **[GATE]**.
