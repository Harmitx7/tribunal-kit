---
name: playwright-ai-e2e
description: Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection..
- **DO NOT activate when:** The task falls strictly outside playwright-ai-e2e domain or belongs to a different dedicated specialist.

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

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
