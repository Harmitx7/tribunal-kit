---
description: Test generation and test running command. Creates and executes tests for code.
---

# /test — Test Quality Engine

$ARGUMENTS

---

This command either generates tests that actually test things, or audits existing tests to find ones that don't. A test that always passes isn't protecting anything.

---

## Modes

```
/test [file or function]     → Generate tests for the target
/test audit                  → Check existing tests for quality issues
/test coverage               → Identify code paths with no test coverage
/test edge [function]        → Generate edge-case tests only (null, empty, boundary)
```

---

## When Generating Tests

**First, the code is read:**
- Every execution path is mapped (normal path, error path, edge cases)
- Direct external dependencies are identified (to mock)
- Expected inputs and outputs are derived from the function signature and behavior

**Then a test plan is written before code:**

```
Target: [function or module]

Path inventory:
  › Normal path with valid input
  › Null / undefined input
  › Empty string / empty array
  › Boundary value (0, -1, MAX)
  › Async rejection / network failure
  › Invalid type input

Dependencies to mock: [list — minimal, only direct deps]
```

**Then tests are written and passed through `test-coverage-reviewer`.**

---

## Test Structure Standard

Every generated test file follows this format:

```typescript
describe('[Unit under test]', () => {

  describe('[scenario group]', () => {
    it('[specific behavior]', () => {
      // Arrange
      const input = [setup value];

      // Act
      const result = functionUnderTest(input);

      // Assert — specific value, not .toBeDefined()
      expect(result).toBe([exact expected value]);
    });
  });

  describe('edge cases', () => {
    it('throws when input is null', () => {
      expect(() => functionUnderTest(null)).toThrow('[exact message]');
    });

    it('handles empty string', () => {
      expect(() => functionUnderTest('')).toThrow('[exact message]');
    });
  });

});
```

---

## When Auditing Existing Tests

The `test-coverage-reviewer` flags:

| Problem | What It Looks Like |
|---|---|
| Tautology test | `expect(fn(x)).toBe(fn(x))` — always passes |
| No assertion | `it('works', () => { fn(); })` — nothing checked |
| Missing edge cases | Suite has happy path only |
| Over-mocking | Every dependency mocked — nothing real tested |

---

## Hallucination Guard

- Only documented Vitest/Jest methods are used — never `test.eventually()`, `expect.when()`, or invented matchers
- Assertions test specific values — `toBe('exact')`, not `toBeDefined()` or `toBeTruthy()`
- Mocks are **minimal** — only the direct external dependency of the unit, not the whole world
- After auditing existing tests: all conclusions are backed by reading the actual test code

---

## Usage

```
/test src/services/auth.service.ts
/test the validateEmail function
/test audit — check whether my existing tests actually assert anything
/test coverage — show branches with no test
```
