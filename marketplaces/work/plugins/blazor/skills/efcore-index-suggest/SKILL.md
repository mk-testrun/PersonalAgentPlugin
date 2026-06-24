---
name: efcore-index-suggest
description: Nutze wenn fehlende Datenbankindizes für EF-Core-Queries vorzuschlagen.
---

## Konfiguration

- MigrationsFolder: ${env:EF_MIGRATIONS_FOLDER:-Migrations}
- DbContext: ${env:EF_DBCONTEXT:-AppDbContext}
- Provider: ${env:DB_PROVIDER:-SqlServer}
- Connection String: via user-secrets (`dotnet user-secrets`)

## Schritte

Analysiere den relevanten EF-Core-Code und führe die notwendigen Schritte aus.
Alle Datenbankschema-Änderungen: **[CONFIRM]** vor dem Ausführen.
