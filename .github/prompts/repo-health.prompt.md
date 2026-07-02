---
mode: agent
description: "Voller Gesundheits-Check des Monorepos (Validierung, Evals, Tests, Maturity, tote Referenzen)"
---

Führe einen vollständigen Gesundheits-Check aus und fasse als Tabelle zusammen:

1. `node tools/validate-plugins.mjs marketplaces/work` und `… marketplaces/home` (auch `--strict`
   probieren und Differenz nennen).
2. `node tools/run-evals.mjs` für beide Welten, `npm run test:tools`, `npm run test:servers`.
3. `node tools/validate-plugins.mjs --maturity` — nenne die 5 schwächsten Skills.
4. Suche tote Referenzen: `.mcp.json`-Server ohne existierendes Paket/Binary, Doku-Links auf
   nicht-existente Dateien, CI-Steps auf nicht-existente Pfade.
5. Priorisiere die Findings (error → warning → hint) und schlage die drei wertvollsten Fixes vor.
   Nichts ändern ohne Rückfrage.
