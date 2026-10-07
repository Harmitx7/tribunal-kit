---
name: tdd-workflow
description: "Use when writing, maintaining, executing, and auditing tdd workflow test suites, assertions, mocks, and verification gates."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - testing-patterns
  - clean-code
  - webapp-testing
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
  - "tdd"
  - "workflow"
---

# TDD Workflow — Red-Green-Refactor Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `tdd-workflow` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when writing, maintaining, executing, and auditing tdd workflow test suites, assertions, mocks, and verification gates.
- **DO NOT activate when:** The task falls outside the `tdd-workflow` domain or is managed by a different dedicated specialist agent.


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

## 2026 TDD & Verification Invariants

1. **Bug Fix Regression Test First**:
   Never fix a bug directly in production code. First write a test reproducing the exact failure case (Red), then apply the minimal fix (Green).
2. **Deterministic Time & Clocks**:
   Never use real `Date.now()` or `setTimeout()` in unit tests. Use fake timers (`vi.useFakeTimers()` or `jest.useFakeTimers()`) for instant, deterministic clock control.
3. **Property-Based Testing Integration**:
   For complex parsing or serialization algorithms, complement example-based unit tests with generative property-based tests (e.g. `fast-check` / `hypothesis`).

## Hallucination Traps (Read First)

- ❌ Writing tests after all code is written → ✅ Write the test first to prove the test actually fails
- ❌ Testing implementation details (e.g. testing private methods) → ✅ Test public interface behavior
- ❌ Mocking what you own → ✅ Use real domain objects in tests; mock only external network/DB I/O
- ❌ Writing 5 assertions testing 5 unrelated things in one test → ✅ One logical behavior per test

## The Iron Law of TDD

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? **Delete it. Start over.**
No exceptions:

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete. Implement fresh from tests.

## Anti-Rationalization Table

| Thought                                  | Reality                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| "This is simple, I'll write tests after" | Simple tasks develop subtle edge cases. Write the test first.        |
| "I know the implementation already"      | Knowing it makes writing the failing test take 30 seconds. Write it. |
| "I'll just keep the code as a reference" | Keeping it biases your tests to match your bugs. Delete it.          |
| "Mocking the whole service is faster"    | Mocking what you own tests your mocks, not your software.            |

---

## The 3-Phase TDD Cycle

```
[ 1. RED ]      Write a failing behavioral test for the minimal next requirement.
                    ↓
[ VERIFY RED ]  Watch it fail for the expected reason (mandatory).
                    ↓
[ 2. GREEN ]    Write the simplest production code to make the test pass.
                    ↓
[ VERIFY GREEN] Run test suite and confirm 0 failures.
                    ↓
[ 3. REFACTOR ] Clean up code & duplicate logic while ensuring tests stay green.
```

---

## 4 TDD Rules

### 1. Test Behavior, Not Implementation Details

- Assert GIVEN / WHEN / THEN behavior results, NOT private class methods or internal variables.

```typescript
// ❌ BAD: Coupling test to internal state
expect(calculator._memoryBuffer).toBe(42);

// ✅ GOOD: Asserting public behavior contract
expect(calculator.add(40, 2)).toBe(42);
```

### 2. The Minimal Green Rule

- In Step 2 (GREEN), write ONLY the minimal code required to pass the test—even if it's hardcoding a return value initially. This forces you to write the next test that proves the hardcoded value inadequate.

### 3. Mock Only External Boundaries

- Never mock internal domain entities or utility functions. Mock ONLY un-owned external boundaries (database IO, network APIs, payment gateways).

### 4. Triangulation Strategy

- When uncertain about algorithm logic, write 2 or more tests with different inputs to force general implementation.

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
