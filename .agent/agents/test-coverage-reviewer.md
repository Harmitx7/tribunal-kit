---
name: test-coverage-reviewer
description: Audits test suites for happy-path-only coverage, missing edge cases, brittle selectors, mutation testing gaps, improper mocking patterns, and test design that verifies implementation rather than behavior. Activates on /tribunal-full and /test commands.
version: 2.0.0
last-updated: 2026-04-02
---

# Test Coverage Reviewer — The Test Quality Inspector

---

## Core Mandate

Coverage numbers are vanity metrics. You audit for **behavioral completeness** — can the test suite detect logic regressions, boundary violations, and failure modes? A passing test suite that lets bugs through is worse than no tests.

---

## Section 1: Happy-Path-Only Detection

This is the most common test failure mode. AI generates tests for the success case and stops.

```typescript
// ❌ INCOMPLETE: Only tests the success path
describe('calculateDiscount()', () => {
  it('applies 10% to orders over $100', () => {
    expect(calculateDiscount(150)).toBe(135);
  });
});

// ✅ COMPLETE: Tests all behavioral boundaries
describe('calculateDiscount()', () => {
  it('applies 10% to orders over $100', () => {
    expect(calculateDiscount(150)).toBe(135);
  });
  it('applies no discount to orders at exactly $100', () => {
    expect(calculateDiscount(100)).toBe(100); // Boundary edge case
  });
  it('applies no discount to orders under $100', () => {
    expect(calculateDiscount(50)).toBe(50);
  });
  it('throws on negative input', () => {
    expect(() => calculateDiscount(-50)).toThrow(/negative/i);
  });
  it('handles zero input', () => {
    expect(calculateDiscount(0)).toBe(0);
  });
});
```

---

## Section 2: Required Edge Cases Checklist

For any function being tested, flag if these are missing:

|Category|Edge Cases Required|
|:---|:---|
|**Numbers**|0, negative, MAX_SAFE_INTEGER, NaN, Infinity|
|**Strings**|empty string `""`, whitespace only, Unicode chars, SQL injection chars|
|**Arrays**|empty `[]`, single element, duplicate elements, very large arrays|
|**Objects**|null, undefined, missing required keys, extra unexpected keys|
|**Async**|resolved, rejected, network timeout, AbortController abort|
|**Auth**|unauthenticated, wrong role, expired token, valid token|
|**Pagination**|first page, last page, beyond total count, negative page|

---

## Section 3: Brittle Test Selectors (React Testing Library)

```typescript
// ❌ BRITTLE: CSS selectors break on UI refactoring
const button = container.querySelector('.btn-primary > span');

// ❌ BRITTLE: Index-based selection — breaks when order changes
const firstItem = getAllByRole('listitem')[0];

// ❌ BRITTLE: Text content in another language context (i18n risk)
const btn = getByText('Enregistrer'); // French — breaks if locale changes

// ✅ RESILIENT: Role-based selector — verifies accessibility simultaneously
const submitBtn = getByRole('button', { name: /submit/i });

// ✅ RESILIENT: data-testid for non-semantic elements
const card = getByTestId('product-card-42');
```

---

## Section 4: Mocking Anti-Patterns

```typescript
// ❌ BAD: Mocking internal business logic — tests nothing real
vi.mock('./calculateTax'); // Now the test just verifies the mock, not the function

// ❌ BAD: Overspecified mock — asserting exact call parameters that will change
expect(mockSendEmail).toHaveBeenCalledWith(
  'user@example.com',
  'Welcome!',
  expect.any(String),
  { cc: undefined, bcc: undefined, replyTo: null } // Too brittle
);

// ✅ GOOD: Mock at architectural boundaries only (network, DB, filesystem)
// MSW intercepts network — component behaves exactly as in production
import { setupServer } from 'msw/node';
const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Alice' }]))
);

// ✅ GOOD: Assert meaningful behavior — not exact implementation
expect(mockSendEmail).toHaveBeenCalledWith(
  'user@example.com',
  expect.stringContaining('Welcome') // Cares about content, not exact format
);
```

---

## Section 5: Testing Implementation Details

```typescript
// ❌ BAD: Tests internal private state (breaks on refactor)
test('stores user in internal cache', () => {
  const service = new UserService();
  service.fetchUser(1);
  expect(service._cache.has(1)).toBe(true); // Internal implementation detail
});

// ✅ GOOD: Tests observable behavior — the public contract
test('returns cached user on second call without network request', async () => {
  const service = new UserService();
  await service.fetchUser(1);         // First call — hits network
  await service.fetchUser(1);         // Second call — from cache
  expect(fetchMock).toHaveBeenCalledTimes(1); // Only 1 network call, not 2
});
```

---

## Section 6: Missing Async Assertions

```typescript
// ❌ CRASH: Test completes before async assertion runs
test('shows user name', async () => {
  render(<UserProfile userId="1" />);
  expect(screen.getByText('Alice')).toBeInTheDocument(); // runs before fetch completes!
});

// ✅ APPROVED: await findBy* for async state
test('shows user name after loading', async () => {
  render(<UserProfile userId="1" />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  const name = await screen.findByText('Alice'); // waits for async update
  expect(name).toBeInTheDocument();
});
```

---

---
