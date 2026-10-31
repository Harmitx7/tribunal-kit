---
name: flaky-test-diagnoser
description: "Use when diagnosing, isolating, fixing, and quarantining non-deterministic or flaky tests caused by timing issues, race conditions, and shared state."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - test-result-analyzer
  - diagnosing-bugs
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
  - "flaky test diagnoser"
  - "flaky test diagnosis"
  - "intermittent test failure"
  - "non-deterministic test"
  - "test race condition"
  - "test quarantine"
---

# Flaky Test Detection & Root-Cause Remediation

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `flaky-test-diagnoser` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Collect minimum 10 CI run logs for the failing test to identify failure frequency and timing patterns
2. **Runtime Context & Platform Invariants**: Verify if failure occurs in isolation or only when executed alongside specific test suites (order dependency)
3. **Execution Guardrails**: Inspect test for real-time timers, hardcoded sleeps (`sleep(500)`), or unhandled microtask queues
4. **Validation & Type Contracts**: Check database isolation and verify whether global state or in-memory caches leak between runs
5. **Observability & Proof of Execution**: Confirm whether network calls or external system clocks are leaking into test scope

## Activation Boundaries
- **Activate when:** Use when diagnosing, isolating, fixing, and quarantining non-deterministic or flaky tests caused by timing issues, race conditions, and shared state.
- **DO NOT activate when:** The task falls outside the `flaky-test-diagnoser` domain or is managed by a different dedicated specialist agent.

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
1. **Never mask flakiness with unconditional test retries**: retries hide architectural race conditions and degrade CI confidence.
2. **Quarantine confirmed flaky tests immediately**: move them out of the blocking merge pipeline while actively debugging.
3. **Replace all arbitrary timeouts with explicit assertion polling or reactive condition awaits.**: Replace all arbitrary timeouts with explicit assertion polling or reactive condition awaits.
4. **Ensure complete test independence**: any test must pass whether executed first, last, or concurrently in a randomized order.

## Hallucination Traps (Read First)
❌ Adding `await new Promise(r => setTimeout(r, 1000))` to "fix" a race condition → ✅ Await the actual DOM or database state change using `waitForSelector` or polling assertions
❌ Assuming a test passes because it runs green locally on a fast machine → ✅ Stress-test locally by running the single test 50 times in a loop (`--repeat-each=50`) under simulated CPU load
❌ Modifying database records without rolling back transactions in `afterEach` → ✅ Wrap tests in transactional rollbacks or isolate schemas
❌ Sharing static mutable state across module instances → ✅ Reset module registries or instantiate fresh instances per test

---

### 1. Diagnostic Stress Runner (Running Test 50x in a Loop)
```bash
# Vitest loop test
npx vitest run tests/unit/payment.spec.ts --repeat=50

# Jest loop script via shell
for i in {1..50}; do npx jest tests/unit/payment.spec.ts --runInBand || break; done

# Playwright stress test with worker randomized order
npx playwright test tests/e2e/checkout.spec.ts --repeat-each=50 --workers=4
```

### 2. Fixing Async Race Conditions with Deterministic Polling
```typescript
// ❌ FLAKY: Arbitrary sleep guessing when job finishes
await triggerBackgroundJob();
await new Promise(r => setTimeout(r, 2000));
const status = await getJobStatus();
expect(status).toBe('COMPLETED');

// ✅ DETERMINISTIC: Polling with timeout and clear failure messages
await triggerBackgroundJob();
await expect.poll(async () => {
  const res = await getJobStatus();
  return res.status;
}, {
  message: 'Background job failed to reach COMPLETED state within 5s',
  timeout: 5000,
  intervals: [100, 250, 500],
}).toBe('COMPLETED');
```

### 3. Order-Dependency Detection
```bash
# Run test suite with randomized execution seed
npx vitest --sequence.shuffle=true --sequence.seed=12345
npx jest --testSequencer=./randomSequencer.js
```

---

## Diagnostic Procedures & Verification Commands
### Step-by-Step Remediation Protocol
1. Reproduce failure in isolation using repetition:
   ```bash
   npx jest path/to/test.spec.ts --repeat=20
   ```
2. Check if randomizing test order causes failure:
   ```bash
   npx vitest run --sequence.shuffle
   ```
3. If failure is confirmed but cannot be fixed immediately, quarantine the test:
   ```typescript
   test.skip(process.env.CI_STRICT === 'true', 'QUARANTINE-104: Flaky under high worker concurrency');
   ```
4. Apply deterministic condition awaiting and re-verify 100 consecutive successful runs.

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


