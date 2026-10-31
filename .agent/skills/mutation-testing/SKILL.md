---
name: mutation-testing
description: "Use when evaluating test suite effectiveness, identifying superficial or false-positive tests, and calculating mutation scores using Stryker or mutmut."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "mutation testing"
  - "mutation score"
  - "stryker mutator"
  - "mutmut"
  - "kill mutants"
  - "test effectiveness audit"
---

# Mutation Testing & Assertion Effectiveness Audit

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `mutation-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm unit test suite runs 100% green before executing mutation testing
2. **Runtime Context & Platform Invariants**: Identify critical business logic files (pricing, auth, discount calculation, state transitions) to scope mutation runs
3. **Execution Guardrails**: Configure test runner timeout multipliers to prevent slow mutants from hanging the pipeline
4. **Validation & Type Contracts**: Exclude boilerplate files (config, migration scripts, type definitions) from mutation scope
5. **Observability & Proof of Execution**: Verify target mutation threshold (e.g. minimum 80% mutation score)

## Activation Boundaries
- **Activate when:** Use when evaluating test suite effectiveness, identifying superficial or false-positive tests, and calculating mutation scores using Stryker or mutmut.
- **DO NOT activate when:** The task falls outside the `mutation-testing` domain or is managed by a different dedicated specialist agent.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Invariants
1. **100% code coverage does NOT mean 100% tested**: if an injected mutation survives, the test suite is blind to bugs.
2. **A killed mutant is proof of assertion quality**: a test must assert specific output values, not just that code executed without throwing.
3. **Scope mutation testing intentionally**: running full mutation suites on large codebases is computationally expensive; target core domain modules.
4. **Differentiate equivalent mutants from surviving mutants**: equivalent mutants cannot be killed because code behavior remains semantically identical.

## Hallucination Traps (Read First)
❌ Writing tests without assertions just to inflate line coverage metrics → ✅ Mutation testing will invert operators and expose 0% mutant kill rate
❌ Mutating entire repository including UI templates in one pass → ✅ Scope Stryker to `src/domain/**/*.ts` or specific PR diffs
❌ Ignoring surviving mutants as "minor edge cases" → ✅ Surviving mutants are actual latent bugs waiting for a regression
❌ Setting infinite test runner timeouts causing infinite loops in mutated `while` loops → ✅ Set Stryker `timeoutMS` to 5000ms

---

### 1. Stryker Configuration (`stryker.config.json`)
```json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/packages/api/schema/stryker-core.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "mutate": [
    "src/domain/pricing/**/*.ts",
    "src/domain/billing/**/*.ts",
    "!src/**/*.spec.ts"
  ],
  "thresholds": {
    "high": 85,
    "low": 75,
    "break": 70
  },
  "timeoutMS": 5000,
  "concurrency": 4
}
```

### 2. Example: Surviving vs Killed Mutant
```typescript
// Original Code in src/domain/pricing/discount.ts
export function calculateDiscount(cartTotal: number, isVip: boolean): number {
  if (cartTotal > 100 && isVip) {
    return cartTotal * 0.20;
  }
  return 0;
}

// Mutant 1 (Condition Boundary): cartTotal >= 100
// Mutant 2 (Invert Negation): cartTotal <= 100
// Mutant 3 (Boolean Inversion): !isVip
// Mutant 4 (Arithmetic): cartTotal / 0.20

// ❌ WEAK TEST (Mutant 1 SURVIVES!):
it('applies discount for vip over 100', () => {
  expect(calculateDiscount(200, true)).toBeGreaterThan(0);
  // Does not test the exact boundary of 100!
});

// ✅ STRONG TEST (Mutants KILLED!):
it('calculates strict discount boundaries for VIP members', () => {
  expect(calculateDiscount(100, true)).toBe(0);      // Boundary check
  expect(calculateDiscount(100.01, true)).toBeCloseTo(20.002);
  expect(calculateDiscount(200, true)).toBe(40);     // Exact calculation check
  expect(calculateDiscount(200, false)).toBe(0);    // Non-vip check
});
```

---

## Diagnostic Procedures & Verification Commands
### Execution & Analysis
1. Run mutation test on specific module:
   ```bash
   npx stryker run --mutate "src/domain/pricing/**/*.ts"
   ```
2. Inspect HTML report for surviving mutants:
   ```bash
   open reports/mutation/mutation.html
   ```
3. Strengthen assertions to kill remaining surviving mutants until score exceeds 85%.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `test-engineer` · `qa-automation-engineer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Do tests follow behavioral GIVEN/WHEN/THEN specifications?
✅ Are happy path, failure paths, and boundary conditions (0, null, max, unicode) covered?
✅ Are test mocks isolated and reset between successive test cases?
✅ Do E2E locators rely on stable ARIA attributes instead of brittle CSS selectors?
✅ Did I verify test suite passes deterministically without flaky race conditions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


