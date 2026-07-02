---
name: pw-explore
description: >-
  Nutze um eine URL mit Playwright zu erkunden und ein stabiles Flow-Skript zu generieren: `playwright
  codegen` liefert den rohen Flow, der dann zu robusten (rollen-/label-basierten) Selektoren verdichtet wird.
  Home darf Internet-Targets. Deterministische Testgenerierung im Work-Stack → testing/e2e-codegen.
---

## Schritte

1. `playwright codegen <url>` → roher Flow
2. Lokatoren stabilisieren (getByRole > getByTestId > CSS); keine `waitForTimeout`
3. `playwright test` ausführen
4. HTML-Report + Screenshots → `state/artifacts/explore-<ts>.html`

## Persistente Tests (token-frei in CI)

Wird aus dem erkundeten Flow ein **dauerhafter** Test, speichere ihn als
`e2e/<feature>.spec.ts` (stabile Selektoren, Assertions auf sichtbares Verhalten,
Playwright-Version gepinnt). Committet läuft er danach in CI **ohne Modell/Token** —
reines `playwright test`.
