---
name: pw-explore
description: Nutze um eine URL mit Playwright zu erkunden und ein stabiles Flow-Skript zu generieren.
mcp_tools:
  - playwright
---

## Schritte

1. `playwright codegen <url>` → roher Flow
2. Lokatoren stabilisieren (getByRole > getByTestId > CSS)
3. `playwright test` ausführen
4. HTML-Report + Screenshots → `state/artifacts/explore-<ts>.html`
