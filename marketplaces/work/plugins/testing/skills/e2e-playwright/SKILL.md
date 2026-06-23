---
name: e2e-playwright
description: Nutze für End-to-End-Tests der lokalen App mit Playwright.
mcp_tools:
  - playwright
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
