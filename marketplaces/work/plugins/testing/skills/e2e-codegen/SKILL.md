---
name: e2e-codegen
description: Nutze um persistente Playwright-Spec-Dateien aus einem Flow zu generieren, die committet werden und danach token-frei in CI laufen.
mcp_tools:
  - playwright
---

## Zweck

Erzeugt **dauerhafte** Test-Dateien (`e2e/*.spec.ts`), keine Wegwerf-Ausführung.
Einmal generiert und committet, laufen sie in CI **ohne LLM/Token** — reines `playwright test`.

**Abgrenzung:** `e2e-playwright` = Tests ausführen · `e2e-pipeline-wire` = CI-Stage erzeugen ·
`e2e-codegen` = die Tests selbst generieren.

## Vorgehen

1. **Flow erfassen** — Schritte als Klartext oder via `playwright codegen http://localhost:*` aufzeichnen.
2. **Spec generieren** — sauberes TypeScript nach `e2e/<feature>.spec.ts`:
   - **Stabile Selektoren:** `getByRole`/`getByLabel`/`data-testid` — **kein** brüchiges CSS/XPath/nth-child.
   - **Assertions** auf sichtbares Verhalten (`toBeVisible`, `toHaveURL`, `toHaveText`).
   - **Fixtures/`beforeEach`** für Setup; keine harten `waitForTimeout` → auto-waiting/`expect`-Polling.
   - **Parametrisierung** (`test.describe` + Daten) statt Copy-Paste.
3. **Pinning** — Playwright-Version in `package.json` exakt pinnen; `playwright.config.ts` mit `baseURL` (localhost) und Reporter.
4. **Selbsttest** — generierte Spec **einmal** lokal grün laufen lassen (über e2e-playwright), dann committen.
5. **CI-Hinweis** — Verdrahtung über `e2e-pipeline-wire`; CI braucht danach kein Modell mehr.

## Qualitäts-Checkliste der generierten Tests

- Deterministisch (keine Zeit-/Zufalls-/Reihenfolgeabhängigkeit, keine `sleep`).
- Isoliert (eigener State pro Test, Teardown sauber).
- Aussagekräftige Testnamen (`feature_action_expectedResult`).
- Nur `localhost:*` als Target (Tool-Guardian).

## Output

Committfähige `e2e/*.spec.ts` + ggf. `playwright.config.ts`. Pfade ausgeben; kein Auto-Commit ohne [CONFIRM].
