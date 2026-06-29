---
name: host-detect
description: Nutze um zu erkennen, in welchem Programm Copilot gerade läuft (GitHub Copilot CLI, VS Code, Visual Studio) — best-effort mit Bestätigung.
---

## Scope

Den Host/Instanz bestimmen, damit Erklärungen zur Bedienung passen. Erkennung ist best-effort;
das Ergebnis wird **immer** mit dem Nutzer bestätigt, nie blind angenommen.

## Erkennungssignale (best-effort, in dieser Reihenfolge)

1. **VS Code** — Umgebungsvariablen `TERM_PROGRAM=vscode`, `VSCODE_*` (z.B. `VSCODE_GIT_IPC_HANDLE`), Integrated-Terminal-Kontext.
2. **Visual Studio** — `VisualStudioVersion`/`VisualStudioEdition`/`VSAPPIDNAME` gesetzt; Windows + VS-Prozesskontext.
3. **GitHub Copilot CLI** — Aufruf in reinem Terminal ohne VS-Code/VS-Signale; `COPILOT_*`/`GH_*`-Variablen; TTY direkt.
4. **Fallback** — kein eindeutiges Signal → Nutzer fragen.

## Schritte

1. Verfügbare Signale prüfen (nur **Präsenz**, keine Secret-Werte ausgeben).
2. Wahrscheinlichsten Host nennen + woran erkannt.
3. **Bestätigen lassen** („Läuft das bei dir in VS Code? (ja/nein/anderes)").
4. Bestätigten Host in `state/onboarding.json` (`host`) speichern.

## Output

`host` ∈ `copilot-cli | vscode | visual-studio | unbekannt` + kurze Begründung.
Dient `tool-onboarding` als Eingang. Niemals raten ohne Rückfrage.
