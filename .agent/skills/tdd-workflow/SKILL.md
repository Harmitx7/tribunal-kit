---
name: tdd-workflow
description: "Use when Test-Driven Development (TDD) mastery. Red-Green-Refactor cycles, behavior-driven design (BDD), strict mutation coverage, test doubles (mocks/stubs/spies), and avoiding test-induced design damage. Use when building complex algorithms, deep business logic, or strictly regulated systems."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - testing-patterns
  - clean-code
  - webapp-testing
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# TDD Workflow — Red-Green-Refactor Mastery

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
