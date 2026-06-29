# Playwright — Pinning & CI Integration

## playwright.config.ts (minimum)
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:5000', trace: 'on-first-retry' },
  reporter: [['html', { open: 'never' }], ['list']],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
});
```

## Version pinning
- Pin exact version in `package.json` (`"@playwright/test": "1.x.y"`), no `^`/`latest`.
- Match the browser install to the pinned version (`npx playwright install --with-deps` in CI).

## Token-free CI
Once committed, the suite runs with **no model**:
```bash
npm ci
npx playwright install --with-deps
npx playwright test
```
Wire the actual pipeline stage with `e2e-pipeline-wire` (starts the app, runs `playwright test`,
publishes the HTML report as an artifact).

## Localhost-only
`baseURL` must be `localhost`/`127.0.0.1` (Tool-Guardian blocks internet targets in the work context).
