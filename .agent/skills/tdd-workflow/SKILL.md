---
name: tdd-workflow
description: Test-Driven Development workflow principles. RED-GREEN-REFACTOR cycle.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Test-Driven Development

> TDD is not about testing. It is about design.
> Writing the test first forces you to design the interface before you know how it will be implemented.

---

## The RED-GREEN-REFACTOR Cycle

Every change in TDD follows three phases:

```
RED    → Write a test that fails (for code that doesn't exist yet)
GREEN  → Write the minimum code to make the test pass
REFACTOR → Clean up the code without changing its behavior
```

The constraint is important: in GREEN phase, write only enough code to pass the test. No more.

---

## RED Phase — Write a Failing Test

Write a test that:
1. Describes one specific piece of behavior
2. Uses the API you wish existed (design the interface first)
3. Fails for the right reason (not a syntax error — a logical failure)

```ts
// RED: This test fails because `validatePassword` doesn't exist yet
it('should reject passwords shorter than 8 characters', () => {
  const result = validatePassword('short');
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Password must be at least 8 characters');
});
```

**The test failing for the right reason is the signal.** If it fails because of a missing import, that's not the RED phase — that's setup.

---

## GREEN Phase — Minimum Code to Pass

Write only what is needed for the test to pass. Resist the urge to also handle the "other cases" — those will get their own tests.

```ts
// GREEN: Minimum implementation to pass the one test
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}
```

The code may be ugly. That is fine. GREEN is about passing the test, not about clean code.

---

## REFACTOR Phase — Clean Without Breaking

Now that the test is green, improve the code:
- Extract duplication
- Clarify naming
- Simplify logic

The constraint: all tests must stay green during and after refactor.

```ts
// REFACTOR: Same behavior, cleaner structure
const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return failure(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return success();
}
```

---

## Triangulation

When a single test could be satisfied by a hardcoded value, write a second test to force a real implementation.

```ts
// Test 1: Could be satisfied by always returning 2
it('should add two numbers', () => {
  expect(add(1, 1)).toBe(2);
});

// Test 2: Forces a real implementation
it('should add two different numbers', () => {
  expect(add(3, 4)).toBe(7);
});
```

**Rule:** If your implementation could be a constant or a special case, triangulate.

---

## When TDD Pays Off

TDD's ROI is highest for:
- Business logic (calculation, validation, state machines)
- Utility functions used in many places
- Error handling paths that are hard to trigger manually
- Refactoring existing code you want to verify still works

TDD's ROI is lower for:
- UI components (Storybook + visual review is often more efficient)
- Database migrations (integration test after, not TDD)
- Exploratory/prototype code that will be thrown away

---

## Common TDD Mistakes

| Mistake | Effect |
|---|---|
| Writing tests after implementation | Tests confirm the implementation, not the behavior |
| Testing too much in one cycle | Large RED-GREEN steps hide design problems |
| Skipping REFACTOR | Code quality degrades with each cycle |
| Not reaching RED | Writing tests that pass immediately means the implementation already existed |
| Mocking everything | Tests become coupled to implementation, not behavior |
