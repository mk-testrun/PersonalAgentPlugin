---
name: e2e-pipeline-wire
description: Nutze um eine ADO-Pipeline-Stage für E2E-Tests zu generieren.
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
