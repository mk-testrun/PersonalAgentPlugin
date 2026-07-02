# ADR-0003 — Home-Marketplace: Plugin-Mapping

## Status
Accepted · 2026-06-23 · Aktualisiert 2026-07-02 (loop→general, fun entfernt) · Ersetzt durch: —

## Kontext
Der Home-Marketplace soll experimentierfreudig, visual-first und mehrsprachig sein: GitHub statt ADO,
entspanntere Policy (warn statt block), aber secret-scan bleibt scharf. Gleiches Schnitt-Problem wie
ADR-0002, andere Domäne.

## Optionen
Analog ADR-0002 (wenige große / eins-pro-Skill / entlang Verantwortungsbereichen). **Gewählt: entlang
Verantwortungsbereichen**, mit visual-first als eigener Persönlichkeit.

## Entscheidung
**8 Plugins:**

| Plugin | Verantwortungsbereich |
|---|---|
| general | GitHub Issues/PRs, Profile (MCP-Sets), Multi-Lang-Conventions, warn-Hooks, Story/Grill/TDD |
| visual | Mermaid, Chart.js, Excalidraw, Cloud-Bild-Gen, SVG, Timeline, Mindmap, Universal-Viewer |
| audio | SuperTonic TTS, Sound-Notifications (postToolUse-Hook) |
| morning | Dashboard-Briefing, Energy-Tracking, Week-Highlight-Reel |
| reviewer | Entspannter Reviewer: auch Internet-Playwright, tolerantes env-lint |
| lab | Playwright codegen, Tool-Inventory neuer MCPs, Home Assistant |
| orchestration | GitHub-Workflows: /feature, /bugfix, /review-flow (kein /ship) + **Agent-Loop** |
| meta | Skill/Plugin/Agent/Command/MCP-Author, Validator, AI-Readiness |

## Abgrenzung audio ↔ morning
- `audio` **besitzt** die TTS-Fähigkeit (speak-summary, sound-notifications).
- `morning` **delegiert** an audio für die TTS-Begrüßung — dupliziert die Fähigkeit nicht; besitzt die
  Dashboard- und Energy-Tracking-Logik.

## Profile-System (funktional, 2026-07)
`general/policy/profiles.json` deklariert MCP-Sets je Profil (coding/writing/media/audio/lab). Die
Umschaltung ist **echt**, nicht nur ein Prompt-Hinweis: Copilot CLI (de)aktiviert MCP-Server zur Laufzeit
per `/mcp enable`/`/mcp disable` (bzw. `copilot mcp enable|disable`) — ohne Neustart. Der
`profile-switch`-Skill mit `scripts/profile-apply.mjs` berechnet deterministisch aus profiles.json, welche
Server an-/auszuschalten sind (Universe = Vereinigung aller Profil-Server), emittiert die exakten
Kommandos und persistiert das aktive Profil in `state/profile.json`. Damit ist die frühere offene Frage
(„schaltet real um vs. nur Prompt-Fokus") aufgelöst. Grenze: `/mcp`-Toggles wirken je Session.

## Konsequenzen
- **Positiv:** visual-first als klare Home-Identität; warn-Regime erlaubt Experimente, secret-scan +
  force-push-main-Schutz bleiben hart.
- **Änderungen ggü. v1:** `loop` ist jetzt in `general` (Home hat kein `experimental`; general ist das Fundament-Plugin); das
  `fun`-Plugin wurde entfernt.
- Wiring: `reviewer/.mcp.json` setzt Playwright **ohne** localhost-Einschränkung;
  `audio/hooks/scripts/notify-with-sound.*` braucht plattformunabhängige Sound-Logik.

## Offene Fragen
- Profile-System: **aufgelöst** (2026-07) — schaltet real über `/mcp enable/disable` um (profile-switch-Skill).
  Verbleibend: sollen Profile über Sessions hinweg automatisch reaktiviert werden (heute merkt sich
  `state/profile.json` nur die letzte Wahl, angewendet wird sie auf `/profile`)?
