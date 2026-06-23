---
name: efcore-migration-revert-plan
description: Nutze wenn einen Rollback-Plan für eine EF-Core-Migration zu erstellen.
---

## Konfiguration

- MigrationsFolder: ${env:EF_MIGRATIONS_FOLDER:-Migrations}
- DbContext: ${env:EF_DBCONTEXT:-AppDbContext}
- Provider: ${env:DB_PROVIDER:-SqlServer}
- Connection String: via user-secrets (`dotnet user-secrets`)

## Schritte

Analysiere den relevanten EF-Core-Code und führe die notwendigen Schritte aus.
Alle Datenbankschema-Änderungen: **[CONFIRM]** vor dem Ausführen.
