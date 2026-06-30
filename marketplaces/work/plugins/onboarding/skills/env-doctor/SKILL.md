---
name: env-doctor
description: Nutze wenn die Entwicklungsumgebung auf Vollständigkeit geprüft werden soll.
---

## Prüfungen

1. **Tools vorhanden:** `dotnet --version`, `git --version`, `node --version`, `betterleaks version`
2. **Optionale Tools:** `az --version`, `docker --version`
3. **Env-Variablen (Präsenz, nie Werte):** ADO_ORG, ADO_PROJECT, CONFLUENCE_URL
4. **Secrets (nur ob gesetzt):** ADO_PAT, CONFLUENCE_TOKEN (Keychain)
5. **Installierte Plugins:** Copilot-CLI Plugin-Liste
6. **Hooks aktiv:** prüfe ob `hooks.json` in general-Plugin vorhanden und referenzierte Skripte ausführbar

## Ausgabe

- ✓ OK / ✗ FEHLT für jede Prüfung
- Konkrete Fix-Befehle für jeden Fehler
- Zusammenfassung: "X von Y Prüfungen OK"
