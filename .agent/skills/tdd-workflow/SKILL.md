---
name: tdd-workflow
description: Test-Driven Development (TDD) mastery. Red-Green-Refactor cycles, behavior-driven design (BDD), strict mutation coverage, test doubles (mocks/stubs/spies), and avoiding test-induced design damage. Use when building complex algorithms, deep business logic, or strictly regulated systems.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Test-Driven Development & Quality Assurance
  tier: pro
  co-requires: [webapp-testing, clean-code]
  trigger-signals:
    strong: [tdd-workflow, red green refactor, test driven development, TDD, slice by slice testing, write test first]
    weak: [write test, unit test logic]
---

# TDD Workflow — Red-Green-Refactor Mastery

Build features and fixes one slice at a time using strict Test-Driven Development (TDD) discipline.

---

## The 3-Phase TDD Cycle

```
[ 1. RED ]    Write a failing behavioral test for the minimal next requirement.
                  ↓
[ 2. GREEN ]  Write the simplest production code to make the test pass.
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

---

## 🤖 LLM-Specific Traps

1. **Writing Code First, Tests Later**: Generating 200 lines of implementation code and adding tests as an afterthought.
2. **Fragile Mock Over-use**: Mocking every internal dependency, creating brittle tests that break during refactoring.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `test-engineer` · `logic-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Was the failing test written and verified BEFORE writing implementation code?
✅ Does the test assert external behavior rather than internal private state?
✅ Are mocks restricted strictly to external IO boundaries?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
