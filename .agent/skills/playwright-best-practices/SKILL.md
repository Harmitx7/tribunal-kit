---
name: playwright-best-practices
description: Playwright End-to-End (E2E) testing mastery. Resilient selectors, auto-waiting mechanisms, parallel test execution, mocking network requests, fixture management, and cross-browser CI configurations. Use when configuring, deploying, or writing E2E web tests.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Playwright E2E — Bulletproof Testing Mastery

> E2E tests prove the system works. Flaky tests prove nothing.
> Never test implementation details. Test what the user experiences.

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

## 🤖 LLM-Specific Traps (Playwright)

1. **WaitTime Hallucinations:** AI constantly suggests `await page.waitForTimeout()` to "fix" failing tests. This is a severe anti-pattern. Rely on Playwright's default auto-waiting, or use `waitForURL / waitForResponse`.
2. **CSS Selector Blindness:** Relying on `.main > div:nth-child(3)` instead of `getByRole`. Tests will break on the next UI update.
3. **Cypress Confusions:** Writing Cypress syntax (`cy.get`) in Playwright files. They are fundamentally different frameworks.
4. **Ignoring Promises:** Playwright actions are async. The AI forgets the `await` keyword, causing the test to complete and close the browser instantly before the assertion happens.
5. **Slow UI Logins:** Executing full UI visual typing of username/password on *every* test. In an E2E suite of 100 tests, this adds 15 minutes. Use API logins to set browser cookies in `beforeEach` (or `globalSetup`).
6. **`.only` Commit Pollution:** Leaving `test.only()` in the code. Enable `forbidOnly` in `playwright.config.ts` so the CI catches it immediately.
7. **Trace Recording Overload:** Using `trace: 'on'` inside the CI. Tracking traces for passes consumes massive disk space. Use `trace: 'on-first-retry'`.
8. **Soft Assertions Abuse:** AI uses `expect.soft()` to suppress failures. If an assertion is critical, allow it to fail the test entirely.
9. **Clicking Hidden Elements:** Trying to `click()` elements that are functionally obscured by modals. If Playwright refuses to click, it's a real bug. Bypassing it via `click({ force: true })` ruins the purpose of E2E testing.
10. **State Leakage:** Failing to realize that tests run completely independently. AI trying to pass variables between `test()` blocks. Variables reset on every definition.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Did I completely eliminate `waitForTimeout` (hard sleep) sleep commands?
✅ Are selectors relying on semantic meaning (`getByRole`, `getByText`) instead of raw CSS?
✅ Have I properly awaited all locator actions and expectations (`await expect...`)?
✅ Are tests completely isolated (no cascading state dependence)?
✅ Is the test executing an API-level authentication bypass if testing underlying features?
✅ Are external 3rd-party SaaS integrations defensively mocked via `page.route`?
✅ Have I respected Playwright's auto-actionability checks (avoiding `{ force: true }`)?
✅ Did I define multiple targeted viewports/browsers inside the `playwright.config.ts`?
✅ Is `forbidOnly` enabled for CI pipelines?
✅ Did I assert user-facing impacts rather than deep implementation variables?
```
