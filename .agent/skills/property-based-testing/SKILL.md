---
name: property-based-testing
description: Generative input invariant testing using fast-check (TS/JS) and hypothesis (Python) to uncover hidden edge cases and boundary failures.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/test_runner.js
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/inner_loop_validator.js
skills:
  - testing-patterns
  - tdd-workflow
  - clean-code
---

# Property-Based Testing — Invariant Verification

## Mandatory Pre-Flight Context Inspection

Before writing property tests:
1. Invariant Identification → Define mathematical properties that must hold true for ALL inputs (e.g. `reverse(reverse(list)) == list`)
2. Arbitrary Generator Scoping → Constrain generator bounds to domain validity (e.g. non-empty strings, positive integers)
3. Shrinking & Reproducibility → Store seed values for failing test runs to reproduce minimal failing inputs

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
    fc.property(
      fc.tuple(fc.string(), fc.double({ min: 0, max: 1000000 })),
      ([prefix, val]) => {
        const input = `${prefix}$${val.toFixed(2)}`;
        const parsed = parseAmount(input);
        
        if (parsed !== null) {
          expect(parsed).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(parsed)).toBe(true);
        }
      }
    ),
    { numRuns: 500 } // Execute 500 generative iterations
  );
});
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Run minimum 100 iterations per property test run.
- Confirm shrinking mechanism isolates minimal failing counter-example on assertion failure.
