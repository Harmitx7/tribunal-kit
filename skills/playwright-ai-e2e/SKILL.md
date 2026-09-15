---
name: playwright-ai-e2e
description: Use when Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection.
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `playwright-ai-e2e` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Modern Playwright 1.45+ E2E web testing, resilient ARIA locators, visual regression testing, network mocking, and AI-assisted flakiness detection.
- **DO NOT activate when:** The task falls outside the `playwright-ai-e2e` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

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

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                              | What Is Actually Correct                                                 |
| :--------------------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Testing Implementation Details** | Asserting on private component state or internal helper functions        | Assert on observable user behaviors, DOM roles, and network outcomes     |
| **Flaky Async Assertion**          | Using arbitrary setTimeout delays before asserting on asynchronous state | Use waitFor or findBy queries that poll with timeout bounds              |
| **Shared Mutable State**           | Reusing database records across concurrent test runners                  | Isolate test databases per worker or execute in rolled-back transactions |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `test-engineer` · `qa-automation-engineer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Do tests follow behavioral GIVEN/WHEN/THEN specifications?
✅ Are happy path, failure paths, and boundary conditions (0, null, max) covered?
✅ Are test mocks isolated and reset between successive suites?
✅ Do E2E locators rely on stable ARIA attributes instead of brittle CSS selectors?
✅ Did I verify test suite passes without flaky race conditions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
