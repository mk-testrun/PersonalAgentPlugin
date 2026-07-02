---
name: sql-conventions
description: >-
  Nutze proaktiv beim Schreiben von SQL-Skripten und EF-Core-Migrations: kein DROP TABLE ohne
  Backup-/Rollback-Plan, jede Migration mit beigelegtem SQL-Skript (efcore-migration-script), sichere Defaults
  und Transaktionsgrenzen. Regel-Skill — meldet Risiken mit konkreter Absicherung.
---

## Regeln

1. **Kein DROP TABLE ohne Plan:** immer Backup-Skript + Rollback-Plan mitliefern
2. **Migrationen:** immer SQL-Skript beilegen (`efcore-migration-script`)
3. **Indizes:** bei Foreign Keys und häufig gefilterten Spalten Index vorschlagen
4. **Transaktionen:** DDL-Statements in explizite Transaktion
5. **NULL-Handling:** explizite DEFAULT-Werte für neue Spalten
