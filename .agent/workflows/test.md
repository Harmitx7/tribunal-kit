---
description: Test generation and test running command. Creates and executes tests for code using the Testing Trophy strategy (unit → integration → E2E). Tests are behavioral (GIVEN/WHEN/THEN), not structural. Tests cannot be approved without covering happy path, error path, and boundary cases.
---

# /test — Test Generation & Execution

$ARGUMENTS

---

## When to Use /test

|Use `/test` when...|Use something else when...|
|:---|:---|
|New code was just generated and needs tests|Tests are failing → `/debug`|
|After `/debug` to prevent regression|Need a full coverage audit → `/audit`|
|Test coverage is below threshold|E2E for the whole app → `/performance-benchmarker`|
|A bug was fixed and needs a regression test||

---

## Testing Trophy Strategy (2026 Standard)

```
             /\
            /E2E\          ← Small (Playwright): happy paths, auth, critical checkout
           /──────\
          /Integr.\        ← Medium (RTL + MSW): component + network behavior  
         /──────────\
        /    Unit    \     ← Foundation (Vitest): pure logic + transformations
       /──────────────\
      /   Static Types  \  ← Free: TypeScript + ESLint
     /────────────────────\
```

When asked to write tests without specifying a level, default to **integration tests** (highest ROI per test).

---

## Phase 1 — Coverage Gap Analysis

Before writing new tests, understand existing coverage:

```bash
npm run test:coverage  # Generate coverage report
```

Cover these areas in priority order:

```
1. Authentication flows (login, logout, session expiry)
2. Data mutation paths (create, update, delete)
3. Validation rejection (invalid input → correct error)
4. Error handling (API failure → correct fallback)
5. Authorization (wrong role → 403, unauthenticated → 401)
6. Boundary values (0, null, empty, max)
```

---

## Phase 2 — Test Design (Behavioral, Not Structural)

Tests describe **behavior**, not implementation:

```
✅ Behavioral: "returns 401 when no auth token is provided"
❌ Structural: "calls validateToken() once"

Format every test as:
GIVEN  [initial state/context]
WHEN   [action taken]
THEN   [observable behavior verified]
```

---

## Phase 3 — Minimum Required Test Coverage

The Tribunal rejects any test submission that does not cover ALL of:

```
□ Happy path — does it work correctly with valid input?
□ Error path — does it fail correctly with invalid/missing input?
□ Boundary cases — what happens at 0, null, empty, max, limits?
□ Auth boundary — what happens without auth? With wrong role?
```

---

## Test Templates by Layer

### Unit Test (Vitest)

```typescript
describe('[functionName]()', () => {
  it('[happy path description]', () => {
    expect(fn(validInput)).toBe(expectedResult);
  });
  
  it('returns [expected] when input is [edge case]', () => {
    expect(fn(boundaryInput)).toBe(expectedBoundaryResult);
  });
  
  it('throws [ErrorType] when [invalid condition]', () => {
    expect(() => fn(invalidInput)).toThrow(ExpectedError);
  });
});
```

### Integration Test (RTL + MSW)

```typescript
test('[user observable behavior]', async () => {
  // GIVEN: server mock defined in handlers.ts
  // WHEN: user action
  render(<Component />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  // THEN: observable outcome
  await screen.findByText(/success/i);
});
```

### E2E Test (Playwright)

```typescript
test('[critical user path]', async ({ page }) => {
  // GIVEN: pre-authenticated (stored session — not login from UI every test)
  // WHEN: navigate and act
  await page.goto('/checkout');
  // THEN: verify final state
  await expect(page.getByText('Order confirmed')).toBeVisible();
});
```

---

## Phase 4 — Test Execution

```bash
# Run tests
npm test                    # Unit + integration
npm run test:e2e           # Playwright E2E (CI environment)
npm run test:coverage      # With coverage report

# target coverage threshold (default 80%)
```

Failed tests halt the workflow. Fix the code or fix the test (not both — understand which first).

---

## Human Gate — Before Writing Test Files

After the test-coverage-reviewer approves:

```
━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━

Generated tests cover:
  ✅ Happy path
  ✅ Error path
  ✅ Boundary cases
  ✅ Auth boundary

Files to write:
  [list of .test.ts files]

Write to disk?  Y = write | N = discard | R = revise coverage
```

No test files are written without explicit approval.

---

## Test Review Verdicts

The `test-coverage-reviewer` is automatically activated and checks:

```
□ Happy path covered for new function/component
□ Error/rejection paths covered
□ Boundary values tested
□ No brittle CSS selectors — only getByRole/getByLabelText
□ No implementation details tested (private state, internal calls)
□ Async assertions use await findBy* (not getBy*)
□ Mock only at architectural boundaries (MSW for network — not hooks/methods)
```

---
