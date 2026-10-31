---
name: visual-regression-testing
description: "Use when capturing, comparing, and approving visual UI diffs, detecting layout shifts, and preventing unexpected CSS regressions with Playwright screenshot testing."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - better-ui
  - review-animations
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
  - "visual regression testing"
  - "screenshot comparison test"
  - "pixelmatch test"
  - "visual diff testing"
  - "layout shift regression"
  - "playwright visual testing"
---

# Visual Regression & Pixel-Diff Testing Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `visual-regression-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm browser rendering consistency across OS environments (use Dockerized Playwright runners in CI)
2. **Runtime Context & Platform Invariants**: Ensure web fonts are preloaded and stabilized before capturing screenshots
3. **Execution Guardrails**: Disable CSS animations and transitions (`animations: "disabled"`) to prevent timing mismatch
4. **Validation & Type Contracts**: Identify and mask dynamic content (dates, random avatars, fluctuating stock prices, session IDs)
5. **Observability & Proof of Execution**: Set calibrated pixel mismatch thresholds (`maxDiffPixelRatio: 0.01` or `threshold: 0.2`)

## Activation Boundaries
- **Activate when:** Use when capturing, comparing, and approving visual UI diffs, detecting layout shifts, and preventing unexpected CSS regressions with Playwright screenshot testing.
- **DO NOT activate when:** The task falls outside the `visual-regression-testing` domain or is managed by a different dedicated specialist agent.

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
1. **Never run visual snapshot generation against non-deterministic dates or timestamps**: always freeze clocks and mask dynamic nodes.
2. **Enforce consistent rendering environments**: snapshot baselines generated on macOS will not match Linux CI runners unless executed inside standardized containers.
3. **Always test mobile, tablet, and desktop viewports explicitly.**: Always test mobile, tablet, and desktop viewports explicitly.
4. **Keep diff thresholds tight**: do not allow 10% pixel differences to hide real component alignment regressions.

## Hallucination Traps (Read First)
❌ Taking screenshots before custom web fonts load → ✅ Wait for `document.fonts.ready` before capturing snapshots
❌ Allowing blinking cursor in text inputs to cause diff failures → ✅ Disable caret or blur inputs prior to snapshot capture
❌ Committing huge uncompressed PNG baselines → ✅ Store snapshots in Git LFS or external artifact buckets
❌ Testing entire full-page scroll layouts when testing a single button component → ✅ Use locator screenshots (`await button.screenshot()`) for isolated components

---

### 1. Robust Visual Snapshot Suite with Playwright
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze browser clock for deterministic date rendering
    await page.clock.setFixedTime(new Date('2026-10-27T12:00:00Z'));
  });

  test('dashboard overview renders consistently across viewports', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for fonts to finish rendering
    await page.evaluate(() => document.fonts.ready);

    // Snapshot full page with dynamic widgets masked
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('.dynamic-user-avatar'),
        page.locator('.realtime-stock-ticker'),
        page.locator('.current-timestamp-badge'),
      ],
      maxDiffPixelRatio: 0.005, // 0.5% tolerance
    });
  });

  test('billing summary card component snapshot', async ({ page }) => {
    await page.goto('/settings/billing');
    const card = page.locator('#billing-summary-card');
    await expect(card).toBeVisible();

    // Isolated component screenshot
    await expect(card).toHaveScreenshot('billing-summary-card.png', {
      animations: 'disabled',
      threshold: 0.1,
    });
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Baseline Management Commands
1. Update golden baseline snapshots when design changes intentionally:
   ```bash
   npx playwright test --update-snapshots
   ```
2. Run visual regression check in Docker container to match CI Linux rendering:
   ```bash
   docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.48.0-noble npx playwright test
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


