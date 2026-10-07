---
name: playwright-best-practices
description: "Use when writing, maintaining, executing, and auditing playwright best practices test suites, assertions, mocks, and verification gates."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - testing-patterns
  - webapp-testing
  - qa-automation-engineer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "playwright"
  - "best"
  - "practices"
---

# Playwright E2E — Bulletproof Testing Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `playwright-best-practices` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when writing, maintaining, executing, and auditing playwright best practices test suites, assertions, mocks, and verification gates.
- **DO NOT activate when:** The task falls outside the `playwright-best-practices` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Using `page.waitForTimeout(3000)` for synchronization -> ✅ Use `page.waitForSelector()`, `expect(locator).toBeVisible()`, or auto-waiting locators
- ❌ Using CSS selectors or XPath for test locators -> ✅ Use `getByRole()`, `getByLabel()`, `getByTestId()` for resilient selectors
- ❌ Running tests without `--workers=1` in CI debug mode -> ✅ Parallel tests with shared state cause flaky failures; isolate tests properly
- ❌ Not using `test.describe.configure({ mode: 'serial' })` when tests have ordering dependencies -> ✅ Explicitly mark serial when needed

---
## 1. Resilience & Auto-Waiting

Playwright automatically waits for elements to be actionable (visible, stable, not obscured).

```typescript
// ❌ FLAKY: Hardcoded sleeps. Fails on slow CI, wastes time on fast local rings.
await page.waitForTimeout(3000);

// ❌ FLAKY: CSS selectors tied to layout/styling changes
await page.locator('.btn-primary > span').click();

// ✅ ROBUST: Playwright auto-waits for actionability based on user-centric selectors
await page.getByRole('button', { name: 'Submit Checkout' }).click();

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
  fullyParallel: true, // Run tests concurrently
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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `test-engineer` · `qa-automation-engineer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Do tests follow behavioral GIVEN/WHEN/THEN specifications?
✅ Are happy path, failure paths, and boundary conditions (0, null, max, unicode) covered?
✅ Are test mocks isolated and reset between successive test cases?
✅ Do E2E locators rely on stable ARIA attributes instead of brittle CSS selectors?
✅ Did I verify test suite passes deterministically without flaky race conditions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


## Verification (Auto-Remediated)

- [ ] **Verify Execution**: Ensure the output matches the original task requirements.
- [ ] **Safety Check**: Validate that no destructive actions occurred outside the requested scope.
