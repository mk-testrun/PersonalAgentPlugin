---
name: profile-switch
description: >-
  Nutze wenn zwischen MCP-Profilen (coding/writing/media/audio/lab) umgeschaltet werden soll oder das
  aktive Profil angezeigt wird. Schaltet die MCP-Server **wirklich** um — über Copilot CLIs
  `/mcp enable`/`/mcp disable` (Laufzeit, kein Neustart). Der Server-Satz je Profil steht in
  policy/profiles.json; das Skript scripts/profile-apply.mjs berechnet deterministisch, welche Server an-
  und welche auszuschalten sind, und gibt die exakten Kommandos aus. Persistiert das aktive Profil.
---

# profile-switch

Kontext-Umschaltung der MCP-Server: `coding` lädt github/context7/git, `media` supertonic/imagegen, `lab`
playwright/chrome-devtools/homeassistant usw. **Echte** Umschaltung, nicht nur ein Prompt-Hinweis —
Copilot CLI (de)aktiviert MCP-Server zur Laufzeit per `/mcp enable`/`/mcp disable`.

## When to Use This Skill

- „Wechsle ins coding/writing/media/audio/lab-Profil" · „/profile lab"
- „Welches Profil ist gerade aktiv?" (aus state/profile.json lesen)

## Workflow

### Schritt 1 — Enable/Disable-Set berechnen (deterministisch)
```bash
node scripts/profile-apply.mjs <profil>            # --form cli (default) → `copilot mcp …`
node scripts/profile-apply.mjs <profil> --form slash   # → `/mcp …` (interaktiv)
```
Gibt die exakten Kommandos aus: erst `disable` für alle Server, die **nicht** ins Profil gehören, dann
`enable` für die Profil-Server. Universe = Vereinigung aller in profiles.json genannten Server.

### Schritt 2 — Kommandos ausführen
Die ausgegebenen Kommandos ausführen — entweder als Terminal-Subcommand (`copilot mcp enable/disable …`,
via execute) oder als interaktive Slash-Kommandos (`/mcp enable/disable …`). Danach sind genau die
Profil-Server aktiv, der Rest ist deaktiviert (bleibt konfiguriert, wird nur nicht genutzt).

### Schritt 3 — Bestätigen
Das Skript persistiert `{profile, enable, disable}` nach `state/profile.json`. Zum Anzeigen des aktiven
Profils diese Datei lesen. Optional `/mcp show` zur Verifikation.

## Profile (policy/profiles.json)

`coding` · `writing` · `media` · `audio` · `lab` — jeweils eine `mcpServers`-Liste. Neues Profil =
Eintrag in profiles.json ergänzen (kein Code nötig; das Skript liest die Datei).

## Output

Die enable/disable-Kommandoliste + `state/profile.json` (aktives Profil). Details, Grenzen und der
Mechanismus: [`reference.md`](reference.md).
