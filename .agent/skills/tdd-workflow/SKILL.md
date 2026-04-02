---
name: tdd-workflow
description: Test-Driven Development (TDD) mastery. Red-Green-Refactor cycles, behavior-driven design (BDD), strict mutation coverage, test doubles (mocks/stubs/spies), and avoiding test-induced design damage. Use when building complex algorithms, deep business logic, or strictly regulated systems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Test-Driven Development (TDD) — Defect-Free Execution Mastery

> You do not write tests to verify your code. You write tests to design your code.
> Unverified code is a liability. TDD is the professional hygiene of software engineering.

---

## 1. The Red-Green-Refactor Cycle

TDD is a strict, irrevocable discipline. Do not write the implementation first.

### Step 1: RED (Write the failing test)
Write the test as if the API already exists exactly how you *wish* it were designed.
Run the test. It MUST fail (because the function doesn't exist, or returns the wrong value). If it passes, the test is useless.

```typescript
// 1. The failing test
import { calculateDiscount } from './pricing';

test('Should apply 10% discount for orders over $100', () => {
    expect(calculateDiscount(150)).toBe(135);
});
// ❌ FAILS: calculateDiscount is not defined
```

### Step 2: GREEN (Make it pass exactly)
Write the absolute minimum, dumbest code required to make the test pass. Do not over-engineer.

```typescript
// 2. The minimum implementation
export function calculateDiscount(subtotal: number): number {
    if (subtotal >= 100) return subtotal * 0.90;
    return subtotal;
}
// ✅ PASSES.
```

### Step 3: REFACTOR
Now wrap the implementation in clean architectural principles. The tests guarantee you haven't broken the behavior while you optimize.

```typescript
// 3. The Refactor
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.90;

export function calculateDiscount(subtotal: number): number {
    return subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : subtotal;
}
// ✅ STILL PASSES. Safe to commit.
```

---

## 2. Test Doubles (Mocks, Stubs, Spies)

Knowing *how* to mock separates amateurs from professionals. Over-mocking destroys architectural integrity.

| Type | When to use | Example |
|:---|:---|:---|
| **Dummy** | Filler objects passed but never used | `processOrder(new UserDummy(), payload)` |
| **Stub** | Hardcodes a specific response | `db.getUser.mockResolvedValue({ id: 1 })` |
| **Spy** | Records how many times a function was called | `expect(emailService.send).toHaveBeenCalledTimes(1)` |
| **Mock** | A spy with predefined expectations of exact payloads | `expect(logger.info).toHaveBeenCalledWith('Authorized')` |

### The Mocking Rule
**Only mock at the architectural boundaries (Database, Network, External FileSystem).**
NEVER mock internal business logic or child pure-functions. If function A calls function B, test A by allowing it to genuinely call B.

---

## 3. Anti-Pattern: Testing Implementation Details

Tests should verify the *behavior* output, not the underlying code structure.

```typescript
class Account {
    private balance = 0;
    deposit(amount: number) { this.balance += amount; }
    getBalance() { return this.balance; }
}

// ❌ BAD: Testing internal state (Fragile)
test('Deposit updates the internal balance variable', () => {
    const acc = new Account();
    acc.deposit(50);
    expect(acc['balance']).toBe(50); // Intrusive test breaks if variable is renamed
});

// ✅ GOOD: Testing external behavior contract
test('Deposit makes the funds available via getBalance', () => {
    const acc = new Account();
    acc.deposit(50);
    expect(acc.getBalance()).toBe(50); // Tests the public API only
});
```

---

## 🤖 LLM-Specific Traps (TDD)

1. **Executing Green-First:** Writing the implementation *before* the test. This completely bypasses the design guidance inherent to TDD.
2. **Test-Induced Design Damage:** Making private methods public just so they can be individually unit tested. Test the private methods exclusively through the public interface.
3. **Mocks as Reality:** AI deeply mocking internal functions (`vi.mock('./utils')`) to the point where the test simply verifies the mock configuration, providing zero real-world confidence.
4. **Fragile "Any" Mocks:** AI writing `expect(mock).toHaveBeenCalledWith(expect.anything())`, neutralizing the actual verification value of the spy.
5. **No Edge Cases:** Generating tests exclusively for the "Happy Path" (valid inputs). TDD requires boundary testing (nulls, negatives, MAX_INT, empty arrays).
6. **Massive Arrange Blocks:** Constructing 100-line object setups before the action occurs. Strongly indicates the code under test requires too many dependencies.
7. **Random Execution Dependency:** Writing tests relying on `Math.random()`, `new Date()`, or real database connections. Tests must be deterministic. Inject interfaces for time and randomizers.
8. **Catch-All Error Checks:** AI writes `expect(fn).toThrowError()`. Assert against specific error messages so regressions in the exact failure reason are detected.
9. **Test Name Obscurity:** `test('Works properly', () => ...)`. The test name should read as explicit documentation of system constraints (`test('Throws InsufficientFundsError when withdrawal exceeds balance')`).
10. **Refactor Skip:** Completing the "Green" phase and stopping. The Refactor phase is where the technical debt is permanently cleared.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Did I write the failing test requirements BEFORE creating the implementation?
✅ Are internal private methods accessed solely via verifying the public API layer?
✅ Were mocks restricted entirely to architectural boundaries (Network/DB/Disk)?
✅ Are date/time instances mocked via FakeTimers to ensure strict determinism?
✅ Do assertions verify precise error messages instead of generic catch-all throws?
✅ Are test case titles descriptive enough to serve as living documentation?
✅ Have all negative edge cases (boundaries, empty states) been accounted for?
✅ Upon achieving 'Green', was a deliberate refactor pass initiated for clean code?
✅ Has `expect.anything()` been avoided to enforce rigid verification of call payloads?
✅ Does the payload setup rely on minimal dummy data instead of colossal stubs?
```
