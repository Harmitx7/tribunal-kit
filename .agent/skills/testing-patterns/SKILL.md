---
name: testing-patterns
description: Testing patterns and principles. Unit, integration, mocking strategies.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Testing Patterns

> Tests don't prove code works. They make it safe to change.
> A codebase without tests is a codebase you're afraid to touch.

---

## Test Pyramid

Write tests at the right level. Most tests should be unit tests. Fewer integration tests. Fewest E2E tests.

```
         /\
        /E2E\         Fewest — expensive to write and run
       /------\
      /Integr. \      Some — verify component interactions  
     /----------\
    /  Unit Tests \   Most — fast, isolated, focused
   /--------------\
```

**Why this shape:**
- Unit tests run in milliseconds — you can have thousands
- E2E tests take seconds — you want dozens, not hundreds
- Inverting the pyramid = slow CI, fragile test suite, low confidence

---

## AAA Pattern

Every test follows this structure:

```ts
it('should return 401 when token is expired', async () => {
  // Arrange — set up the scenario
  const expiredToken = generateToken({ expiresIn: '-1s' });
  const request = buildRequest({ authorization: `Bearer ${expiredToken}` });

  // Act — do the thing being tested
  const response = await authMiddleware(request);

  // Assert — verify the outcome
  expect(response.status).toBe(401);
  expect(response.body.error).toBe('Token expired');
});
```

Never combine Arrange and Assert. Never skip Arrange by relying on test state from a previous test.

---

## Unit Tests

Unit tests test one unit of logic in isolation. Everything external is replaced with a controlled substitute.

```ts
// Test the function's logic — not the database, not the network
it('should hash the password before saving', async () => {
  const mockSave = vi.fn().mockResolvedValue({ id: '1' });
  const userRepo = { save: mockSave };

  await createUser({ email: 'a@b.com', password: 'secret' }, userRepo);

  const savedUser = mockSave.mock.calls[0][0];
  expect(savedUser.password).not.toBe('secret');          // was hashed
  expect(savedUser.password).toMatch(/^\$2b\$/);           // bcrypt format
});
```

**Rules for unit tests:**
- One assertion per concept (multiple `expect` calls are fine if they verify the same behavior)
- No network calls, no file system, no real database
- Tests are order-independent — they don't rely on state from other tests
- Test names describe behavior: `should X when Y` or `returns X given Y`

---

## Integration Tests

Integration tests verify that two or more components work together correctly.

```ts
// Tests the real database interaction
it('should save and retrieve a user', async () => {
  const user = await UserService.create({ email: 'test@test.com', name: 'Test' });
  const found = await UserService.findById(user.id);

  expect(found.email).toBe('test@test.com');
});
```

**Integration test rules:**
- Use a real test database — not a mock
- Clean up data before or after each test (use transactions that rollback, or seed scripts)
- Slower than unit tests — run on CI but not on every file save

---

## Mocking Principles

Mocks replace external dependencies. Use them accurately.

```ts
// ❌ Mock that returns nothing useful
vi.mock('./mailer', () => ({ send: vi.fn() }));

// ✅ Mock that reflects real behavior
vi.mock('./mailer', () => ({
  send: vi.fn().mockResolvedValue({ messageId: 'mock-id-123' }),
}));
```

**What to mock:**
- External HTTP calls (payment gateways, third-party APIs)
- Time (`Date.now()`, `new Date()`) when time-dependent
- File system in unit tests
- Email/SMS sending

**What not to mock:**
- Your own business logic
- The function being tested
- Simple pure utility functions

---

## Test Coverage

Coverage measures which lines are executed during tests. 100% coverage does not mean the code is correct.

**Useful coverage:**
- `> 80%` for business logic modules
- Focus on statement + branch coverage (not just line coverage)
- Low coverage on infrastructure/config files is acceptable

**Coverage anti-patterns:**
- Tests written solely to increase coverage numbers
- Asserting that mocks were called instead of asserting real outcomes
- Tautology tests: `expect(result).toBe(result)`

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/test_runner.py` | Runs test suite and reports results | `python scripts/test_runner.py <project_path>` |
