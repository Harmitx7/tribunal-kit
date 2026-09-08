---
name: property-based-testing
description: Generative input invariant testing using fast-check (TS/JS) and hypothesis (Python) to uncover hidden edge cases and boundary failures.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Generative input invariant testing using fast-check (TS/JS) and hypothesis (Python) to uncover hidden edge cases and boundary failures..
- **DO NOT activate when:** The task falls strictly outside property-based-testing domain or belongs to a different dedicated specialist.

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

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
