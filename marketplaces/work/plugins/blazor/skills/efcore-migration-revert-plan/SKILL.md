---
name: efcore-migration-revert-plan
description: >-
  Nutze um einen sicheren Rollback-Plan für eine EF-Core-Migration zu erstellen, BEVOR sie produktiv geht —
  inkl. Datenverlust-Risiken und Reihenfolge. Migration erstellen → efcore-migration-add; Forward-SQL →
  efcore-migration-script.
---

## Scope

Rückweg einer Migration durchdenken, **bevor** sie produktiv geht. Erstellen → efcore-migration-add;
Forward-Skript → efcore-migration-script.

## Kontext

- MigrationsFolder: `${env:EF_MIGRATIONS_FOLDER:-Migrations}` · DbContext: `${env:EF_DBCONTEXT:-AppDbContext}` · Provider: `${env:DB_PROVIDER:-SqlServer}`

## Schritte

1. **Down-Pfad prüfen** — existiert eine vollständige `Down`-Methode? Stellt sie den Vorzustand wirklich her?
2. **Datenverlust bewerten** — Welche Spalten/Tabellen würde der Rollback droppen? Welche Daten gingen verloren?
3. **Backup-Schritt** — vor Rollback betroffene Daten sichern (Export/temp. Tabelle); Schritt explizit benennen.
4. **Rollback-Skript** — `dotnet ef migrations script --idempotent --from <Target> --to <Previous>` erzeugen und reviewen.
5. **Reihenfolge** — App-Deploy ↔ DB-Rollback-Reihenfolge festlegen (erst App auf alte Version, dann DB, oder Expand/Contract).
6. **Forward-Fix-Alternative** — wenn Down destruktiv ist: „Roll-forward"-Fix-Migration statt Rückwärts-Rollback empfehlen.

## Checkliste

1. **EFR-NODOWN** — `Down` fehlt/unvollständig → kein sauberer Rollback möglich. *(high)*
2. **EFR-DATALOSS** — Rollback verliert seit der Migration entstandene Daten. *(high)*
3. **EFR-ORDER** — App/DB-Versions-Kompatibilität während des Rollbacks nicht gewährleistet. *(medium)*

## Output

Rollback-Plan (Schritte + Backup + Reihenfolge) und das Rollback-Skript. **Kein** Auto-Revert ohne **[CONFIRM]**.
