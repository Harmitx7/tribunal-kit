---
name: property-based-testing
description: "Use when Generative input invariant testing using fast-check (TS/JS) and hypothesis (Python) to uncover hidden edge cases and boundary failures."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - testing-patterns
  - tdd-workflow
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/inner_loop_validator.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Property-Based Testing — Invariant Verification

---

## 🛠️ Technical Architecture & Reference Recipes

## Fast-Check Arbitrary Generator & Vitest Invariant Test

```typescript
import fc from 'fast-check';
import { test, expect } from 'vitest';

function parseAmount(currencyStr: string): number | null {
  const cleaned = currencyStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

test('currency parser invariant: non-negative parsed numbers', () => {
  fc.assert(
    fc.property(fc.tuple(fc.string(), fc.double({ min: 0, max: 1000000 })), ([prefix, val]) => {
      const input = `${prefix}$${val.toFixed(2)}`;
      const parsed = parseAmount(input);

      if (parsed !== null) {
        expect(parsed).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(parsed)).toBe(true);
      }
    }),
    { numRuns: 500 }, // Execute 500 generative iterations
  );
});
```
