---
name: test-suite-optimizer
description: "Use when profiling test suite runtimes, eliminating CI bottlenecks, configuring test runner sharding, and optimizing test parallelization."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - cicd-pro
  - throughput-optimizer
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
  - "test suite optimizer"
  - "optimize test runtime"
  - "slow test suite profiling"
  - "test sharding ci"
  - "test parallelization"
  - "speed up tests"
---

# Test Suite Runtime & CI Sharding Optimization

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `test-suite-optimizer` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Profile existing test suite execution to identify the top 10 slowest test files
2. **Runtime Context & Platform Invariants**: Check CPU core availability on CI runners to calibrate worker thread counts
3. **Execution Guardrails**: Inspect test isolation to ensure tests can execute in parallel without port or DB collision
4. **Validation & Type Contracts**: Verify whether TypeScript compilation or source bundling overhead can be cached between runs
5. **Observability & Proof of Execution**: Differentiate fast unit tests (<5ms) from heavy integration tests (>500ms)

## Activation Boundaries
- **Activate when:** Use when profiling test suite runtimes, eliminating CI bottlenecks, configuring test runner sharding, and optimizing test parallelization.
- **DO NOT activate when:** The task falls outside the `test-suite-optimizer` domain or is managed by a different dedicated specialist agent.

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
1. **Unit tests must execute in memory without disk or network I/O**: a 1,000-test unit suite should finish in under 3 seconds.
2. **Shard heavy E2E tests across parallel CI nodes (`--shard=1/4`) rather than running sequentially on a single runner.**: Shard heavy E2E tests across parallel CI nodes (`--shard=1/4`) rather than running sequentially on a single runner.
3. **Never allow single test files to run longer than 30 seconds**: split large test files into focused sub-suites.
4. **Avoid redundant module re-compilations**: use Vitest / esbuild in-memory transforms over heavy ts-jest compiler passes.

## Hallucination Traps (Read First)
❌ Setting `maxWorkers=1` globally because of shared database state → ✅ Isolate test database schemas per worker and run with full CPU parallelization
❌ Running slow browser E2E tests on every single git commit → ✅ Run unit and fast integration tests on pre-push; run heavy E2E in parallel CI stages
❌ Re-seeding entire static database fixtures inside `beforeEach` → ✅ Seed static reference tables once in `beforeAll` and truncate dynamic tables in `afterEach`
❌ Leaving slow console.log statements across thousands of test loops → ✅ Silence or mock `console.log` in test environment

---

### 1. Identifying Slow Tests in Vitest & Jest
```bash
# Profile slow tests with Vitest
npx vitest run --reporter=verbose --benchmark

# Profile top 10 slowest tests in Jest
npx jest --maxWorkers=4 --testLocationInResults
```

### 2. GitHub Actions CI Matrix Test Sharding
```yaml
name: Test Suite Sharding
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - name: Run Test Shard ${{ matrix.shard }}/4
        run: npx vitest run --shard=${{ matrix.shard }}/4 --coverage
```

### 3. Splitting Fast Unit Tests from Slow Integration Tests
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**'],
    maxWorkers: '100%',
    isolate: false, // Ultra-fast for pure unit tests
  },
});
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Performance Measurement
1. Measure baseline full-suite runtime:
   ```bash
   time npm test
   ```
2. Verify test duration drops by ~60-70% when sharded across 4 parallel runners.

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


