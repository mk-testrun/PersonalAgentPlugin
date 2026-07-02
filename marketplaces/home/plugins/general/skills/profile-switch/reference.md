# profile-switch — Referenz

## §1 Der echte Mechanismus (kein Prompt-Placebo)

Copilot CLI verwaltet MCP-Server in `~/.copilot/mcp-config.json` (bzw. `$COPILOT_HOME`). Server lassen
sich **zur Laufzeit** (de)aktivieren, ohne Neustart:

| Interaktiv | Terminal | Wirkung |
|---|---|---|
| `/mcp disable <name>` | `copilot mcp disable <name>` | Server bleibt konfiguriert, wird in der Session **nicht** genutzt |
| `/mcp enable <name>` | `copilot mcp enable <name>` | zuvor deaktivierten Server wieder aktivieren |
| `/mcp show` | `copilot mcp show` | Status aller Server + ihre Tools |

Das Profil-System nutzt genau diese Kommandos — deshalb schaltet es **wirklich** um, statt nur den
Prompt zu färben.

## §2 Warum ein Skript (Anti-Drift)

Welche Server an-/auszuschalten sind, ist deterministisch aus `policy/profiles.json` ableitbar — nichts,
was das Modell raten sollte. `scripts/profile-apply.mjs`:

1. liest `profiles.json`,
2. bildet das **Universe** = Vereinigung aller in irgendeinem Profil genannten Server,
3. `enable` = Server des gewählten Profils, `disable` = Universe − enable,
4. gibt die exakten Kommandos aus (disable zuerst, dann enable) und persistiert `state/profile.json`.

So kann kein Server „vergessen" werden und die Reihenfolge ist stabil.

## §3 profiles.json-Schema

```json
{
  "profiles": {
    "coding": { "description": "…", "mcpServers": ["github", "context7", "filesystem", "git"] },
    "lab":    { "description": "…", "mcpServers": ["playwright", "chrome-devtools", "homeassistant"] }
  },
  "default": "coding"
}
```
Neues Profil oder anderer Server-Satz → nur diese Datei ändern. Servernamen müssen den in den
`.mcp.json` konfigurierten Namen entsprechen (das ist der Schlüssel, über den `/mcp enable/disable` geht).

## §4 Grenzen / Caveats

- `/mcp enable/disable` wirkt **je Session**. Nach einem Neustart gilt wieder die volle `mcp-config.json`;
  `state/profile.json` merkt sich die letzte Wahl, damit `/profile` sie erneut anwenden kann.
- Ein Server, der in **keinem** Profil steht, wird nie automatisch deaktiviert (er ist nicht Teil des
  Universe). Bewusste Entscheidung — profiles.json ist die Definition des Verwalteten.
- Das Skript ändert `mcp-config.json` **nicht** selbst (kein riskantes Rewrite); es emittiert die
  offiziellen Kommandos, die der Agent/Nutzer ausführt.
