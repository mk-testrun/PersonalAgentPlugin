---
name: efcore-migration-add
description: >-
  Nutze um eine neue EF-Core-Migration sicher aus Modelländerungen zu erzeugen und vor dem Anwenden zu prüfen
  (Datenverlust, Rename-Fallen, PendingModelChanges). SQL-Skript für Deploys → efcore-migration-script;
  Rollback-Plan → efcore-migration-revert-plan.
---

## Scope

Neue Migration aus Modelländerungen erzeugen und reviewen. SQL-Skript → efcore-migration-script;
Rollback → efcore-migration-revert-plan.

## Kontext

- MigrationsFolder: `${env:EF_MIGRATIONS_FOLDER:-Migrations}` · DbContext: `${env:EF_DBCONTEXT:-AppDbContext}`
- Provider: `${env:DB_PROVIDER:-SqlServer}` · Connection nur via `dotnet user-secrets`.

## Schritte

1. **Erzeugen** — `dotnet ef migrations add <Name> --context ${env:EF_DBCONTEXT:-AppDbContext} --output-dir ${env:EF_MIGRATIONS_FOLDER:-Migrations}`. Name beschreibt die Änderung (PascalCase).
2. **Diff prüfen** — generierte `Up`/`Down` lesen: Stimmt sie mit der beabsichtigten Änderung überein? Keine ungewollten Drops/Renames?
3. **Daten vs Schema** — reine Schema-Änderung oder auch Datenmigration nötig? Datenmigration explizit als `migrationBuilder.Sql(...)` ergänzen.
4. **Destruktiv?** — Spalten-/Tabellen-Drop, NOT NULL ohne Default, Typänderung mit Datenverlust → markieren, Backup/Backfill planen.
5. **Anwenden** — **[CONFIRM]** vor `dotnet ef database update`. In Prod statt direktem Update das Skript (efcore-migration-script) durch die Pipeline.

## Verboten

- Eine bereits **angewandte/gemergte** Migration editieren (stattdessen neue Migration).
- `database update` ohne vorherigen Diff-Review und [CONFIRM].

## Output

Pfad der neuen Migration + Diff-Zusammenfassung + Hinweis auf Destruktivität/Datenmigration.
