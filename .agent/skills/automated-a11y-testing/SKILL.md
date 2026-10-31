---
name: automated-a11y-testing
description: "Use when integrating automated web accessibility testing with axe-core and Playwright, enforcing WCAG 2.1/2.2 AA standards, ARIA roles, and keyboard navigation."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - webapp-testing
  - web-accessibility-auditor
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "automated a11y testing"
  - "accessibility testing playwright"
  - "axe core testing"
  - "wcag compliance testing"
  - "aria role validation test"
  - "keyboard accessibility test"
---

# Automated Web Accessibility (a11y) Pipeline Testing

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `automated-a11y-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm target compliance baseline (WCAG 2.1 Level AA or WCAG 2.2 Level AA)
2. **Runtime Context & Platform Invariants**: Inspect web components for interactive elements lacking keyboard focus indicators
3. **Execution Guardrails**: Check for dynamically injected content and modals requiring focus trap testing
4. **Validation & Type Contracts**: Verify whether automated axe-core scans are configured in Playwright/Cypress E2E test runs
5. **Observability & Proof of Execution**: Ensure design system color tokens meet minimum 4.5:1 contrast ratios for normal text

## Activation Boundaries
- **Activate when:** Use when integrating automated web accessibility testing with axe-core and Playwright, enforcing WCAG 2.1/2.2 AA standards, ARIA roles, and keyboard navigation.
- **DO NOT activate when:** The task falls outside the `automated-a11y-testing` domain or is managed by a different dedicated specialist agent.

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

## 2026 Invariants
1. **Zero critical accessibility violations**: automated CI builds must fail if axe-core detects critical or serious WCAG AA violations.
2. **Test interactive states, not just static pages**: run accessibility assertions when dialogs are open, dropdowns expanded, and error banners visible.
3. **Keyboard navigation must be testable**: verify Tab navigation order and Enter/Space trigger behavior for all interactive controls.
4. **Every form input must be associated with a valid programmatic label (`for`/`id` or `aria-labelledby`).**: Every form input must be associated with a valid programmatic label (`for`/`id` or `aria-labelledby`).

## Hallucination Traps (Read First)
❌ Relying solely on manual accessibility reviews → ✅ Automate catchable regressions (contrast, missing alt, broken ARIA) in CI with axe-core
❌ Assuming automated a11y testing catches 100% of issues → ✅ Automated testing catches ~40-50% of WCAG issues; combine with keyboard flow assertions
❌ Scanning before client-side hydration finishes → ✅ Wait for dynamic UI state to settle before executing `AxeBuilder.analyze()`

---

### 1. Playwright + axe-core Automated Test Suite
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (WCAG 2.1 AA)', () => {
  test('landing page meets accessibility standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Example: if third-party widget has known external issue
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('checkout modal traps keyboard focus and has valid dialog role', async ({ page }) => {
    await page.goto('/checkout');
    await page.click('button#open-payment-modal');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal has accessible name
    await expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

    // Run axe scan specifically on the open modal container
    const modalAxeResults = await new AxeBuilder({ page })
      .include('div[role="dialog"]')
      .analyze();

    expect(modalAxeResults.violations).toEqual([]);

    // Test keyboard focus trapped inside modal
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(['card-number', 'close-modal-btn']).toContain(focusedElement);
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Verification & CI Enforcement
1. Run automated accessibility test suite:
   ```bash
   npx playwright test tests/a11y/
   ```
2. Output detailed violation reports formatted for CI logs:
   ```typescript
   if (results.violations.length > 0) {
     console.error(JSON.stringify(results.violations, null, 2));
   }
   ```

---

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


