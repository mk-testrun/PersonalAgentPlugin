---
name: env-lint
description: Nutze proaktiv beim Prüfen von Umgebungskonfigurations-Dateien.
---

## Regeln

1. **Key-Konsistenz:** gleiche Variablen konsistent benannt in allen Dateien
2. **Kein echtes Secret in .env.example:** nur Platzhalter
3. **isSecret für token-artige Keys:** alle Keys die `token|password|secret|key|pat` enthalten
4. **Keine Doppeldefinitionen** zwischen appsettings.Development.json und launchSettings.json
5. **isSecret: true** in azure-pipelines*.yml für alle Credentials

Ergebnis als findings[] (area: env).
