---
description: MCP-Profil wechseln — coding/writing/media/audio/lab. Schaltet Server wirklich um (/mcp enable/disable).
---
**Usage:** `/profile <coding|writing|media|audio|lab>` (ohne Argument → aktives Profil aus state/profile.json anzeigen)

Nutze den `profile-switch`-Skill: `node scripts/profile-apply.mjs <profil>` berechnet aus
policy/profiles.json deterministisch die enable/disable-Kommandos; führe sie aus (`copilot mcp
enable/disable …` bzw. `/mcp …`). Danach sind genau die Profil-Server aktiv. Das aktive Profil wird in
state/profile.json persistiert.
