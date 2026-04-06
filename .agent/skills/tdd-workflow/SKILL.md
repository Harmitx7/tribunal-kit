---
name: tdd-workflow
description: Test-Driven Development (TDD) mastery. Red-Green-Refactor cycles, behavior-driven design (BDD), strict mutation coverage, test doubles (mocks/stubs/spies), and avoiding test-induced design damage. Use when building complex algorithms, deep business logic, or strictly regulated systems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Test-Driven Development (TDD) — Defect-Free Execution Mastery

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

|Type|When to use|Example|
|:---|:---|:---|
|**Dummy**|Filler objects passed but never used|`processOrder(new UserDummy(), payload)`|
|**Stub**|Hardcodes a specific response|`db.getUser.mockResolvedValue({ id: 1 })`|
|**Spy**|Records how many times a function was called|`expect(emailService.send).toHaveBeenCalledTimes(1)`|
|**Mock**|A spy with predefined expectations of exact payloads|`expect(logger.info).toHaveBeenCalledWith('Authorized')`|

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
