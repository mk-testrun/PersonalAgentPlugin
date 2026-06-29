---
name: efcore-migration-script
description: Nutze um ein idempotentes SQL-Migrationsskript aus EF-Core-Migrationen zu erzeugen (für Pipeline-Deploys).
---

## Scope

Versionierbares SQL für kontrollierte Deploys statt `database update` zur Laufzeit.
Migration erstellen → efcore-migration-add; Rollback → efcore-migration-revert-plan.

## Kontext

- MigrationsFolder: `${env:EF_MIGRATIONS_FOLDER:-Migrations}` · DbContext: `${env:EF_DBCONTEXT:-AppDbContext}` · Provider: `${env:DB_PROVIDER:-SqlServer}`

## Schritte

1. **Skript erzeugen** — idempotent, vom letzten angewandten zum Ziel:
   `dotnet ef migrations script --idempotent --from <LastApplied> --to <Target> --context ${env:EF_DBCONTEXT:-AppDbContext} --output state/artifacts/migration-<from>-<to>.sql`
2. **Review** — auf riskante Statements prüfen (siehe Checkliste), bevor es in die Pipeline geht.
3. **Ablage** — Skript nach `state/artifacts/`; in der Pipeline als reviewter, approval-gegateter Schritt ausführen (siehe testing/pipeline-conventions).

## Review-Checkliste

1. **EFS-DROP** — `DROP TABLE/COLUMN` → Datenverlust; Backfill/Backup vorab. *(high)*
2. **EFS-NOTNULL** — neue `NOT NULL`-Spalte ohne `DEFAULT` auf befüllter Tabelle → Fehler/Verlust. *(high)*
3. **EFS-TYPECHANGE** — Typänderung mit möglichem Truncate/Verlust. *(high)*
4. **EFS-LOCK** — Index-Erstellung/Spalten-Änderung auf großer Tabelle → Lock/Downtime; Online-Strategie prüfen. *(medium)*
5. **EFS-IDEMPOTENT** — Skript ist wirklich idempotent (Guard-Checks vorhanden). *(medium)*

## Output

SQL-Skript-Pfad + Review-Befunde. Kein direktes Ausführen gegen Prod aus dem Skill heraus.
