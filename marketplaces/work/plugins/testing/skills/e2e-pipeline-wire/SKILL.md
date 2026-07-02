---
name: e2e-pipeline-wire
description: >-
  Nutze um eine ADO-Pipeline-Stage für E2E-Tests zu generieren: startet die App im Hintergrund (dotnet run),
  wartet auf Readiness, fährt die Playwright-Suite (localhost) und veröffentlicht Ergebnisse/Traces als
  Artefakt. Ergänzt e2e-playwright/e2e-codegen um die CI-Integration.
---

## Generiert

ADO-Pipeline-Stage (YAML) die:
1. App startet (`dotnet run` im Hintergrund)
2. `playwright test` ausführt
3. Playwright-Report als Pipeline-Artefakt publisht

## Hinweise

- Nutze pipeline-conventions für die Gesamt-Pipeline
- Approval-Gate vor Deployment wenn E2E-Stage nicht grün
- Playwright-Version explizit pinnen
