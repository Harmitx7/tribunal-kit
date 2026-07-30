---
name: tdd-workflow
description: Test-Driven Development (TDD) mastery. Red-Green-Refactor cycles, behavior-driven design (BDD), strict mutation coverage, test doubles (mocks/stubs/spies), and avoiding test-induced design damage. Use when building complex algorithms, deep business logic, or strictly regulated systems.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
skills:
  - testing-patterns
  - clean-code
  - webapp-testing
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
---

# TDD Workflow — Red-Green-Refactor Mastery

---

## Mandatory Pre-Flight Context Inspection

Before implementing feature logic or writing unit tests, you MUST inspect:
1. Red-Green-Refactor Cycle (Section 25) → Write failing test FIRST (Red) → minimal passing code SECOND (Green) → cleanup THIRD (Refactor)
2. Behavior-First Assertion Rule (Section 36) → Assert public contract results (GIVEN/WHEN/THEN); ban asserting internal private fields or state
3. IO Boundary-Only Mocking (Section 50) → Mock ONLY un-owned external boundaries (DB IO, network APIs); ban mocking domain entities or pure utils

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
