# Playwright Spec — Selectors & Structure

## Selector priority (most → least stable)
1. `getByRole('button', { name: 'Save' })` — accessible role + name
2. `getByLabel('Email')` / `getByPlaceholder(...)` — form fields
3. `getByTestId('order-row')` — needs `data-testid` in the app
4. `getByText(...)` — only for stable, unique copy
5. ❌ CSS/XPath/`nth-child` — brittle, avoid

## Structure
```ts
import { test, expect } from '@playwright/test';

test.describe('checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');            // baseURL from config
  });

  test('checkout_validCart_showsConfirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.getByText('Order confirmed')).toBeVisible();
    await expect(page).toHaveURL(/\/confirmation/);
  });
});
```

## Rules
- **Auto-waiting only:** rely on `expect(...).toBeVisible()` polling; never `page.waitForTimeout()`.
- **Assert visible behavior**, not implementation (URL, visible text, element state).
- **Isolation:** each test self-contained; reset state in `beforeEach`/`afterEach`; no shared mutable state.
- **Parametrize** data-driven cases with `test.describe` + a loop, not copy-paste.
- **Names:** `feature_action_expectedResult`.
- Forward slashes in paths.
