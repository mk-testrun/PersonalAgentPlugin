# AGENTS.md

> TODO: Projektname und Ein-Satz-Zweck.

## Projekt

- **Stack:** TODO (z. B. .NET 9 / Blazor Server, oder Python 3.13 + uv)
- **Einstiegspunkt:** TODO (z. B. `src/App/Program.cs`)
- **Architektur-Doku:** TODO (Link oder „keine")

## Kommandos

```bash
# TODO: Die drei Kommandos, die ein Agent wirklich braucht:
# build:   …
# test:    …
# lint:    …
```

Vor jedem Commit: Tests + Lint müssen grün sein. Bei roten Tests: Ausgabe zeigen, nicht raten.

## Konventionen

- Formatierung kommt aus `.editorconfig` — nicht überstimmen.
- Commits: imperativ, eine logische Änderung pro Commit.
- TODO: projektspezifische Regeln (Naming, Ordnerstruktur, verbotene Muster).

## Grenzen

- Keine Secrets in Dateien oder Logs; Konfiguration über Env-Vars.
- Destruktive Git-Operationen (force-push, reset --hard) nur nach Rückfrage.
- TODO: weitere No-Gos (z. B. „keine DB-Migrationen ohne Review").
