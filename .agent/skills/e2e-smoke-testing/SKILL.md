---
name: e2e-smoke-testing
description: "Use when authoring lightweight post-deployment production smoke tests, verifying critical path health, synthetic transactions, and canary releases."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - cicd-pro
  - webapp-testing
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
  - "e2e smoke testing"
  - "production smoke test"
  - "post deployment verification"
  - "synthetic transactions"
  - "canary smoke test"
  - "critical path smoke check"
---

# Production & Canary Deployment Smoke Testing

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `e2e-smoke-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm smoke test suite executes in under 2 minutes to provide instant deployment gating
2. **Runtime Context & Platform Invariants**: Verify that all synthetic operations are read-only or strictly idempotent with test tenant credentials
3. **Execution Guardrails**: Ensure alerts are wired to trigger on smoke test failure to initiate instant canary rollbacks
4. **Validation & Type Contracts**: Check healthcheck endpoints for deep subsystem status (database ping, redis ping, queue depth)
5. **Observability & Proof of Execution**: Confirm environment variable target URL injection (`SMOKE_BASE_URL`)

## Activation Boundaries
- **Activate when:** Use when authoring lightweight post-deployment production smoke tests, verifying critical path health, synthetic transactions, and canary releases.
- **DO NOT activate when:** The task falls outside the `e2e-smoke-testing` domain or is managed by a different dedicated specialist agent.

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
1. **Smoke tests must be non-destructive**: never mutate production customer records during a live smoke run.
2. **Test the critical user path**: if login, home feed, or checkout fail, the deploy must be rolled back immediately.
3. **Fast execution budget**: smoke tests must complete within 90 seconds to allow rapid CI/CD deployment pipelines.
4. **Verify real asset delivery**: test that CSS stylesheets, JS bundles, and public CDN assets return HTTP 200.

## Hallucination Traps (Read First)
❌ Creating real billing credit card transactions during production smoke tests → ✅ Use synthetic read-only payment gateway probe tokens
❌ Running full 2-hour E2E regression suite as a smoke test → ✅ Smoke tests must test only the 5-10 most critical user paths
❌ Testing only the `/healthz` ping without verifying HTML/API rendering → ✅ A server returning 200 on `/healthz` can still serve 500s on the main app
❌ Hardcoding staging URLs inside smoke tests → ✅ Parameterize target host via `SMOKE_BASE_URL`

---

### 1. Production Smoke Test Suite (Playwright)
```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://production.example.com';

test.describe('Post-Deployment Production Smoke Suite', () => {
  test('1. Core Health & Dependency Ping', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health/deep`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('HEALTHY');
    expect(body.services.database).toBe('CONNECTED');
    expect(body.services.redis).toBe('CONNECTED');
  });

  test('2. Public Web Assets & Landing Page Render', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    expect(res?.status()).toBe(200);

    // Verify main header and CTA are present
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Verify assets loaded without browser console errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    expect(errors).toHaveLength(0);
  });

  test('3. Synthetic Read-Only User Authentication & Session Check', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[type="email"]', process.env.SMOKE_TEST_USER || 'smoke-agent@test.internal');
    await page.fill('input[type="password"]', process.env.SMOKE_TEST_PASS || 'SecureSmokePass123!');
    await page.click('button[type="submit"]');

    // Verify redirected to dashboard with valid authenticated session
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/dashboard`));
    await expect(page.locator('#user-profile-badge')).toBeVisible();
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Deployment Pipeline Integration
```bash
# Run smoke tests against fresh deployment URL
SMOKE_BASE_URL=https://canary.example.com npx playwright test tests/smoke/ --workers=2
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


