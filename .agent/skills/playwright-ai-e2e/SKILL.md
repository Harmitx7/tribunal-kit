---
name: playwright-ai-e2e
description: Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/test_runner.js
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/visual_audit.js
skills:
  - playwright-best-practices
  - webapp-testing
  - testing-patterns
---

# Playwright AI E2E Testing — 2026 Standards

## Mandatory Pre-Flight Context Inspection

Before writing end-to-end web tests:
1. ARIA Role Locators → Use accessibility roles (`getByRole`, `getByText`) over brittle CSS selectors
2. Auto-Waiting & Zero Sleep → Avoid `page.waitForTimeout()`; rely on Playwright built-in auto-waiting
3. Network Interception → Mock external third-party APIs using `page.route()` for deterministic CI runs

## Resilient E2E API Route Mocking & Interaction Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept external analytics API to avoid flaky network calls
    await page.route('**/api/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ visits: 1042, conversions: 88 }),
      });
    });
  });

  test('user views analytics dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Resilient ARIA locators
    const heading = page.getByRole('heading', { name: 'Analytics' });
    await expect(heading).toBeVisible();

    const visitsText = page.getByText('1042');
    await expect(visitsText).toBeVisible();
  });
});
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Run Playwright test suite in headless mode and verify zero flakiness.
- Ensure all interactive elements rely on resilient locators.
