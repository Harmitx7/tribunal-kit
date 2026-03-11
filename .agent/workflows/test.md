---
description: Test generation and test running command. Creates and executes tests for code.
---

# /test — Test Quality Engine

$ARGUMENTS

---

This command either **generates tests that actually test things**, or **audits existing tests** to find ones that don't. A test that always passes isn't protecting anything.

---

## When to Use /test vs Other Commands

| Use `/test` when... | Use something else when... |
|---|---|
| No tests exist for working code | Code is broken → `/debug` first, then `/test` |
| Tests exist but coverage is thin | Quality of test assertions → use `audit` mode |
| You changed behavior and need regression tests | Full project test health → `/audit` |
| You want edge case coverage only | Integration tests → specify in the test plan |

---

## Modes

```
/test [file or function]     → Generate tests for the target
/test audit                  → Check existing tests for quality issues
/test coverage               → Identify code paths with no test coverage
/test edge [function]        → Generate edge-case tests only (null, empty, boundary)
/test run                    → Run the existing test suite and analyze failures
```

---

## Mode: Generate Tests

### First — Read the Code

Before writing a single test, map:

- Every **execution path** (normal path, error path, edge cases)
- All **direct external dependencies** (to identify what needs mocking)
- **Expected inputs and outputs** — derived from the function signature and actual behavior, not assumed

### Then — Write the Test Plan

A plan must be written **before** test code:

```
Target: [function or module name]
Framework: [Jest | Vitest | pytest | Go test]

Path inventory:
  › Normal path — valid input, expected output
  › Null / undefined / None input
  › Empty string / empty array / empty object
  › Boundary values (0, -1, MAX_INT, max string length)
  › Async rejection / network failure / timeout
  › Invalid type input (string where number expected, etc.)
  › Auth / permission fail path
  › Concurrent access (if applicable)

Dependencies to mock: [list — minimal, only direct external deps]
```

**Then tests are written and passed through `test-coverage-reviewer`.**

---

## Test Structure Standard

Every generated test file follows this format:

```typescript
describe('[Unit under test]', () => {

  describe('[scenario group]', () => {
    it('[specific behavior being tested]', () => {
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
      expect(() => functionUnderTest(null)).toThrow('[exact error message]');
    });

    it('handles empty string without crashing', () => {
      expect(functionUnderTest('')).toBe([expected fallback value]);
    });
  });

});
```

---

## Mode: Audit Existing Tests

The `test-coverage-reviewer` flags:

| Problem | What It Looks Like | Why It's Bad |
|---|---|---|
| Tautology test | `expect(fn(x)).toBe(fn(x))` | Always passes regardless of fn's behavior |
| No assertion | `it('works', () => { fn(); })` | Passes even if fn throws wrong output |
| Missing edge cases | Suite has happy path only | Misses real-world failure modes |
| Over-mocking | Every dep mocked, nothing real tested | Tests the mocking framework, not the code |
| Vacuous truthy | `expect(result).toBeTruthy()` | Passes for `1`, `"a"`, `{}`, `[]` |

---

## Mode: Run Tests

```bash
// turbo
python .agent/scripts/test_runner.py . --coverage
```

After running, the `test-result-analyzer` identifies:
- Root causes across multiple failing test files
- Whether failures are from flaky setup or actual code breakage
- Actionable fix recommendations

---

## Hallucination Guard

- Only **documented** Vitest/Jest/pytest methods are used — never `test.eventually()`, `expect.when()`, or inventions
- Assertions test **specific values** — `toBe('exact')`, not `toBeDefined()` or `toBeTruthy()`
- Mocks are **minimal** — only the direct external dependency, not the whole world
- All conclusions about existing test quality are backed by **reading the actual test code**
- `// VERIFY: check this matcher exists` on any assertion method not commonly used

---

## Cross-Workflow Navigation

| After /test shows... | Go to |
|---|---|
| Failures in existing tests after a change | `/debug` to find root cause |
| Code has no tests and is untested in prod | `/review` first for quality check |
| Tests pass but logic seems wrong | `/review [file]` for deeper audit |
| Coverage gaps found in security-sensitive paths | `/audit` for full project security + test sweep |

---

## Usage

```
/test src/services/auth.service.ts
/test the validateEmail function
/test audit — check whether my existing tests actually assert anything
/test coverage — show branches with no test
/test edge validateInput — generate null, empty, boundary tests only
/test run — execute the suite and analyze failures
```
