---
name: playwright-best-practices
description: Playwright End-to-End (E2E) testing mastery. Resilient selectors, auto-waiting mechanisms, parallel test execution, mocking network requests, fixture management, and cross-browser CI configurations. Use when configuring, deploying, or writing E2E web tests.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Playwright E2E — Bulletproof Testing Mastery

---

## 1. Resilience & Auto-Waiting

Playwright automatically waits for elements to be actionable (visible, stable, not obscured).

```typescript
// ❌ FLAKY: Hardcoded sleeps. Fails on slow CI, wastes time on fast local rings.
await page.waitForTimeout(3000); 

// ❌ FLAKY: CSS selectors tied to layout/styling changes
await page.locator('.btn-primary > span').click();

// ✅ ROBUST: Playwright auto-waits for actionability based on user-centric selectors
await page.getByRole('button', { name: "Submit Checkout" }).click();

// ✅ ROBUST: Testing for expected states 
await expect(page.getByText('Order confirmed')).toBeVisible();
```

### The Selector Hierarchy (Best to Worst)
1. `page.getByRole()` — Checks accessibility simultaneously.
2. `page.getByText()` — Finds elements by raw text values.
3. `page.getByTestId()` — Resilient to text/translation updates (`data-testid`).
4. `page.locator('css')` — Brittle, bound to DOM structures. Use only as last resort.

---

## 2. Test Isolation & Fixtures

Do not cascade tests (where Test B requires Test A to pass first). Playwright gives every test a blank browser context isolated from the rest.

```typescript
import { test, expect } from '@playwright/test';

// ❌ BAD: Cascading state
test.describe('Dashboard', () => {
  test('Login', async ({ page }) => {
    await login(page); // Next test assumes this succeeded
  });
  test('Action', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click(); 
  });
});

// ✅ GOOD: Isolated tests via beforeEach or Custom Fixtures
test.beforeEach(async ({ page }) => {
  // Login directly via API to bypass slow UI login, seeding cookies
  await performFastApiLogin(page);
  await page.goto('/dashboard');
});

test('Should save settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Saved successfully');
});
```

---

## 3. Network Mocking

E2E tests that rely on external 3rd party APIs (Stripe, SendGrid) will fail randomly due to network latency outside your control.

```typescript
test('Should block invalid credit cards', async ({ page }) => {
  // Intercept the outgoing request to the payment processor
  await page.route('**/api/v1/charge*', async route => {
    // Return a mocked failure response immediately
    const json = { status: 'declined', message: 'Insufficient funds' };
    await route.fulfill({ status: 400, json });
  });

  await page.getByRole('button', { name: 'Purchase' }).click();
  await expect(page.getByText('Insufficient funds')).toBeVisible();
});
```

---

## 4. Configuration for CI/CD

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,   // Run tests concurrently
  forbidOnly: !!process.env.CI, // Fail build if `.only` was left in code
  retries: process.env.CI ? 2 : 0, // Retry flakes on CI only
  workers: process.env.CI ? 1 : undefined, // Reduce CI overload
  reporter: 'html',

  use: {
    trace: 'on-first-retry', // Record trace viewer ONLY on failure to save space
    video: 'retain-on-failure',
    baseURL: 'http://localhost:3000',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile Viewport Example
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],

  // Spin up local server before running tests
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---
