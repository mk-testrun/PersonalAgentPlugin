---
name: e2e-playwright
description: >-
  Nutze für End-to-End-Tests der lokalen App mit Playwright — ausschließlich gegen localhost:* (kein Internet,
  Work-Guardrail). Startet die App (dotnet run), fährt stabile, selektor-robuste Flows und meldet Fehler mit
  Trace. Test-Generierung aus einer URL → e2e-codegen; CI-Anbindung → e2e-pipeline-wire.
---

## Voraussetzungen

- App lokal startbar (`dotnet run`)
- Nur `localhost:*` als Target

## Schritte

1. App starten: `dotnet run --project ${env:DOTNET_SOLUTION_PATH}`
2. Warten bis App erreichbar (max. 30s)
3. Playwright-Tests aus `e2e/` Verzeichnis ausführen: `playwright test`
4. HTML-Report + Screenshots → `state/artifacts/e2e-<date>.html`

## Tool-Guardian

Playwright ist auf `localhost:*` beschränkt — kein Internet-Zugriff.
