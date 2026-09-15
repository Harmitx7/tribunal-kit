---
name: test-result-analyzer
description: Use when Ingests test logs and identifies root causes across multiple failing test files. Provides actionable fix recommendations.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - systematic-debugging
  - testing-patterns
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Test Result Analyzer Skill

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `test-result-analyzer` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Ingests test logs and identifies root causes across multiple failing test files. Provides actionable fix recommendations.
- **DO NOT activate when:** The task falls outside the `test-result-analyzer` domain or is managed by a different dedicated specialist.

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

---

## When to Activate

- After a test run with multiple failures.
- When the user says "tests are failing", "analyze test results", "what broke?", or "test failed".
- During CI/CD pipeline debugging.
- When `test_runner.js` or any test command exits with failures.
- When paired with `systematic-debugging` for deep root-cause investigation.

## Analysis Pipeline

```
Test output (terminal or log file)
    │
    ▼
Runner detection — identify test framework from output format
    │
    ▼
Failure extraction — parse each FAIL block into structured data
    │
    ▼
Clustering — group failures by root module, error type, shared dependency
    │
    ▼
FPF detection — find the First Point of Failure
    │
    ▼
Dependency graph — map cascade relationships
    │
    ▼
Fix recommendations — ordered by impact (most failures resolved first)
    │
    ▼
Report — structured output with confidence levels
```

## Step 1: Runner Detection

Auto-detect the test framework from output patterns:

| Framework   | Detection Pattern                                 | Failure Marker                |
| ----------- | ------------------------------------------------- | ----------------------------- |
| Jest        | `PASS`/`FAIL` with file paths, `●` for test names | `FAIL src/...`                |
| Vitest      | `✓`/`×` markers, `FAIL` blocks                    | `❯ FAIL` or `× test name`     |
| pytest      | `PASSED`/`FAILED` with `::` separator             | `FAILED tests/...::test_name` |
| Go test     | `ok`/`FAIL` with package paths                    | `--- FAIL: TestName`          |
| Mocha       | `passing`/`failing` counts, indented suites       | `N failing` section           |
| JUnit (XML) | `<testsuite>` XML structure                       | `<failure>` elements          |
| RSpec       | `.F` markers, `Failures:` section                 | `Failure/Error:`              |
| Cargo test  | `test result: FAILED`                             | `---- test_name stdout ----`  |

## Step 2: Failure Extraction

For each failure, extract a structured record:

```
{
  test_name:    "should return 401 for unauthenticated requests"
  test_file:    "src/api/auth.test.ts"
  test_line:    42
  error_type:   "AssertionError"
  expected:     "401"
  received:     "200"
  stack_trace:  ["auth.test.ts:42", "auth.middleware.ts:18", "express/router.ts:..."]
  source_files: ["auth.middleware.ts:18"]  // files from YOUR codebase in the stack
}
```

## Step 3: Failure Clustering

Group failures into clusters based on shared characteristics:

### Cluster Types

| Cluster Type        | How to Detect                                         | Typical Root Cause                       |
| ------------------- | ----------------------------------------------------- | ---------------------------------------- |
| **Shared Module**   | Multiple tests import from the same file that changed | Missing export, type change, API change  |
| **Same Error Type** | All failures throw `TypeError` or `ConnectionError`   | Broken dependency, env issue             |
| **Shared Fixture**  | Tests using same `beforeEach`/setup fail together     | Fixture setup failure cascading          |
| **Import Chain**    | Failures follow the import graph                      | Dependency that fails to resolve         |
| **Environment**     | All tests fail with connection/config errors          | Missing env var, DB not running          |
| **Timing**          | Tests pass individually, fail together                | Race condition, shared state             |
| **Snapshot**        | Multiple `toMatchSnapshot` failures                   | Intentional UI change (update snapshots) |

### Cascade Detection Algorithm

```
1. Sort failures by file path and execution order.
2. Find the FIRST failure in execution order → candidate FPF.
3. Check if the FPF's source file appears in other failures' import chains.
4. If yes → FPF is the root cause, other failures are cascades.
5. If no → failures are independent (multiple root causes).
```

## Step 4: First Point of Failure (FPF) Detection

The FPF is the most valuable finding — fix it first, and cascading failures resolve automatically.

```
Example:
  12 test files fail.
  11 of them import from `utils/auth.ts`.
  The first failure is in `utils/auth.test.ts` at line 42.
  Error: `generateToken is not exported from './auth'`

  FPF: utils/auth.ts:42 — missing export
  Cascade: 11 other test files fail because they can't import generateToken
  Fix: Add `export { generateToken }` to utils/auth.ts
  Expected resolution: 12 of 12 failures (100%)
```

**FPF Confidence Levels:**

| Confidence | Criteria                                                 |
| ---------- | -------------------------------------------------------- |
| **HIGH**   | Same source file in >50% of failure stack traces         |
| **MEDIUM** | Same error type across multiple test files               |
| **LOW**    | Failures appear independent, multiple root causes likely |

## Step 5: Fix Recommendations

For each cluster, provide actionable fixes:

| Fix Type              | Example                                         | How to Verify                         |
| --------------------- | ----------------------------------------------- | ------------------------------------- |
| **Missing Export**    | `export { fn }` added to module                 | Re-run failing tests                  |
| **Type Mismatch**     | Function signature changed, callers need update | Check callers with `grep_search`      |
| **Stale Mock**        | Mock doesn't match new interface                | Compare mock to actual implementation |
| **Env Variable**      | `.env.test` missing `DATABASE_URL`              | Check `.env.example` vs `.env.test`   |
| **Snapshot Update**   | Intentional UI change                           | Run with `--updateSnapshot` flag      |
| **Race Condition**    | Tests share global state                        | Add isolation or `beforeEach` reset   |
| **Dependency Update** | Package API changed after upgrade               | Check changelog of updated package    |

### Fix Priority Formula

```
Priority = (Tests_Resolved × 10) + (Confidence_Score × 5) - (Estimated_Fix_Time_Minutes)

Fix in this order:
1. Highest priority score first
2. If tied, prefer HIGH confidence
3. If still tied, prefer fewer files to change
```

## Report Format

```
━━━ Test Result Analysis ━━━━━━━━━━━━━━━━

Runner:    [Jest / Vitest / pytest / Go / auto-detected]
Total:     48 tests across 12 files
Result:    36 passed | 12 failed | 0 skipped
Duration:  4.2s
Coverage:  78% statements (if available)

━━━ First Point of Failure ━━━━━━━━━━━━━━

📍 utils/auth.test.ts → line 42
   Error:  `generateToken` is not exported from `./auth`
   Type:   ImportError
   Impact: Cascades to 11 other test files

   This is the root cause. Fix this first.

━━━ Failure Clusters ━━━━━━━━━━━━━━━━━━━━

Cluster 1: Missing Export  (11 tests, HIGH confidence)
  Root:       utils/auth.ts:42
  Cascade:    auth.test.ts, users.test.ts, sessions.test.ts, ...
  Fix:        Add `export { generateToken }` to auth.ts
  Resolution: 11 of 12 failures (92%)
  Priority:   ★★★★★ (115 pts)

Cluster 2: Stale Mock  (1 test, MEDIUM confidence)
  Root:       api/users.test.ts:98
  Error:      Expected { name, email, role } but received { name, email }
  Fix:        Add `role: "user"` to mock at line 15
  Resolution: 1 of 12 failures (8%)
  Priority:   ★★☆☆☆ (20 pts)

━━━ Fix Plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Fix utils/auth.ts export
        → Expected: 11 failures resolved
        → Time: ~2 minutes
        → Run: npx jest utils/auth.test.ts (verify FPF fix)

Step 2: Update mock in api/users.test.ts:15
        → Expected: 1 failure resolved
        → Time: ~1 minute

Step 3: Re-run full suite
        → Expected: all 12 failures resolved (0 remaining)

━━━ Warnings ━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ No test coverage report detected. Consider adding --coverage flag.
⚠️ 3 test files have no assertions (test names end in `.todo`).
```

## Edge Cases

### All Tests Fail

```
If 100% of tests fail → likely environment issue, not code:
  1. Check if dev server / database is running
  2. Check .env.test for missing variables
  3. Check node_modules exists (run npm install)
  4. Check for breaking dependency upgrade in recent commits
```

### Flaky Tests

```
If same test passes on retry → flaky:
  1. Check for shared mutable state between tests
  2. Check for time-dependent assertions
  3. Check for unresolved promises / async leaks
  4. Check for network-dependent tests without mocks
```

### Only Snapshot Tests Fail

```
If only snapshot tests fail → likely intentional UI change:
  1. Review snapshot diffs
  2. If changes are expected: run with --updateSnapshot
  3. If changes are unexpected: check for unintended CSS/component changes
```

## Cross-Skill Integration

| Paired Skill           | Integration Point                                        |
| ---------------------- | -------------------------------------------------------- |
| `systematic-debugging` | Escalate when FPF is unclear → 4-phase debug methodology |
| `testing-patterns`     | Reference when recommending test structure improvements  |
| `workflow-optimizer`   | Flag inefficient test-debug-retest loops                 |

## Anti-Hallucination Guard

- **Only analyze test output that was actually produced** — never generate fake test results.
- **Never invent file paths or line numbers** — only reference what appears in the stack trace.
- **Verify source files exist** before suggesting fixes — use `view_file` or `find_by_name`.
- **Mark uncertainty**: `// UNCERTAIN: log format not fully recognized, manual review recommended`.
- **Never guess at assertion values** — quote exactly what "Expected" and "Received" say in the output.
- **Don't assume test runner** — auto-detect from output format, don't assume Jest.

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
