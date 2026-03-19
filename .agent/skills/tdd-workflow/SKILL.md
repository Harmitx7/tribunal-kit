---
name: tdd-workflow
description: Test-Driven Development workflow principles. RED-GREEN-REFACTOR cycle.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Test-Driven Development

> TDD is not about testing. It is about design.
> Writing the test first forces you to design the interface before you know how it will be implemented.

---

## The RED-GREEN-REFACTOR Cycle

Every change in TDD follows three phases:

```
RED    → Write a test that fails (for code that doesn't exist yet)
GREEN  → Write the minimum code to make the test pass
REFACTOR → Clean up the code without changing its behavior
```

The constraint is important: in GREEN phase, write only enough code to pass the test. No more.

---

## RED Phase — Write a Failing Test

Write a test that:
1. Describes one specific piece of behavior
2. Uses the API you wish existed (design the interface first)
3. Fails for the right reason (not a syntax error — a logical failure)

```ts
// RED: This test fails because `validatePassword` doesn't exist yet
it('should reject passwords shorter than 8 characters', () => {
  const result = validatePassword('short');
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Password must be at least 8 characters');
});
```

**The test failing for the right reason is the signal.** If it fails because of a missing import, that's not the RED phase — that's setup.

---

## GREEN Phase — Minimum Code to Pass

Write only what is needed for the test to pass. Resist the urge to also handle the "other cases" — those will get their own tests.

```ts
// GREEN: Minimum implementation to pass the one test
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}
```

The code may be ugly. That is fine. GREEN is about passing the test, not about clean code.

---

## REFACTOR Phase — Clean Without Breaking

Now that the test is green, improve the code:
- Extract duplication
- Clarify naming
- Simplify logic

The constraint: all tests must stay green during and after refactor.

```ts
// REFACTOR: Same behavior, cleaner structure
const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return failure(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return success();
}
```

---

## Triangulation

When a single test could be satisfied by a hardcoded value, write a second test to force a real implementation.

```ts
// Test 1: Could be satisfied by always returning 2
it('should add two numbers', () => {
  expect(add(1, 1)).toBe(2);
});

// Test 2: Forces a real implementation
it('should add two different numbers', () => {
  expect(add(3, 4)).toBe(7);
});
```

**Rule:** If your implementation could be a constant or a special case, triangulate.

---

## When TDD Pays Off

TDD's ROI is highest for:
- Business logic (calculation, validation, state machines)
- Utility functions used in many places
- Error handling paths that are hard to trigger manually
- Refactoring existing code you want to verify still works

TDD's ROI is lower for:
- UI components (Storybook + visual review is often more efficient)
- Database migrations (integration test after, not TDD)
- Exploratory/prototype code that will be thrown away

---

## Common TDD Mistakes

| Mistake | Effect |
|---|---|
| Writing tests after implementation | Tests confirm the implementation, not the behavior |
| Testing too much in one cycle | Large RED-GREEN steps hide design problems |
| Skipping REFACTOR | Code quality degrades with each cycle |
| Not reaching RED | Writing tests that pass immediately means the implementation already existed |
| Mocking everything | Tests become coupled to implementation, not behavior |

---

## 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Ending the GREEN or REFACTOR phases based on assumption that the code is correct.
- ✅ **Required:** You are explicitly forbidden from completing a test cycle or ending your task without providing **concrete terminal evidence** that the test suite actually ran and returned a strictly passing (GREEN) result.

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Tdd Workflow Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Tdd Workflow
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
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
