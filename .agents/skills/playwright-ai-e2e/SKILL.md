---
name: playwright-ai-e2e
description: "Use when Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - playwright-best-practices
  - webapp-testing
  - testing-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/visual_audit.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Playwright AI E2E Testing — 2026 Standards

---

## 🛠️ Technical Architecture & Reference Recipes

## Resilient E2E API Route Mocking & Interaction Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept external analytics API to avoid flaky network calls
    await page.route('**/api/analytics', async route => {
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
