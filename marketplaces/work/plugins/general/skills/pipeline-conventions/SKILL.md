---
name: pipeline-conventions
description: Nutze proaktiv beim Schreiben oder Reviewen von Azure-Pipelines-YAML-Dateien.
applyTo: ["**/azure-pipelines*.yml", "**/azure-pipelines*.yaml"]
---

## Regeln (proaktiv prüfen)

1. **Approval-Stage für Prod:** `environment` mit Approval-Gate vor jedem Prod-Deploy
2. **Kein `latest`-Tag:** Container-Images immer mit festem Digest/Version pinnen
3. **Secret-Variablen:** `isSecret: true` für alle Keys die `token|password|secret|key|pat` enthalten
4. **Caching:** `cache` für npm/NuGet/pip aktivieren (Cache-Key: lockfile-Hash)
5. **Branch-Policies:** `gitleaks` und `kingfisher` als Gate-Step (kein Merge ohne grünen Scan)
6. **Kein `continue-on-error: true`** außer bei optionalen Analyse-Steps

## Bei Problemen

- Approval-Stage fehlt → konkrete Stage-Definition vorschlagen
- Hardcoded Secret-Wert gefunden → **[GATE]** — blockiere sofort, schlage `$(variableName)` vor
