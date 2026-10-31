---
name: api-fuzz-testing
description: "Use when conducting negative testing, boundary value fuzzing, malformed input injection, and schema resilience testing across REST and GraphQL endpoints."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - api-patterns
  - clean-code
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
  - "api fuzz testing"
  - "negative testing api"
  - "boundary value testing"
  - "malformed payload testing"
  - "input fuzzing"
  - "schema boundary attack"
---

# API Boundary & Negative Fuzz Testing Framework

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `api-fuzz-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Identify API boundary parameter types (strings, numbers, arrays, UUIDs, enums)
2. **Runtime Context & Platform Invariants**: Confirm API returns appropriate 4xx status codes (400, 422) rather than 500 Internal Server Error on invalid input
3. **Execution Guardrails**: Verify that database error messages and stack traces are suppressed in HTTP responses
4. **Validation & Type Contracts**: Inspect maximum payload body limit configurations to prevent Denial of Service (DoS)
5. **Observability & Proof of Execution**: Check string normalization (null bytes, unicode homoglyphs, emojis, deep JSON nesting)

## Activation Boundaries
- **Activate when:** Use when conducting negative testing, boundary value fuzzing, malformed input injection, and schema resilience testing across REST and GraphQL endpoints.
- **DO NOT activate when:** The task falls outside the `api-fuzz-testing` domain or is managed by a different dedicated specialist agent.

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
1. **Never return 500 Internal Server Error on malformed client inputs**: all client errors must produce clean 400 or 422 responses.
2. **Sanitize all input types**: numbers exceeding 64-bit integer limits, null bytes (`\0`), and arrays with 100,000 items must be safely rejected.
3. **Never leak stack traces or raw database query syntax in client responses.**: Never leak stack traces or raw database query syntax in client responses.
4. **Every required parameter must be tested with**: missing, null, empty string, wrong type, and out-of-bounds values.

## Hallucination Traps (Read First)
❌ Only testing happy path payloads in API integration tests → ✅ Always generate permutations of missing and invalid fields
❌ Allowing deeply nested JSON payloads (`{ a: { b: { c: ... } } }`) to exhaust server stack depth → ✅ Configure body parser `depthLimit`
❌ Accepting negative numbers in pagination (`?limit=-10&offset=-50`) → ✅ Validate bounds with Zod: `z.number().positive()`
❌ Letting unhandled validation errors crash the Node.js process → ✅ Wrap controllers in standard exception filters

---

### 1. Automated Boundary Permutation Test Suite (Vitest)
```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('POST /api/v1/users - Negative Fuzz Tests', () => {
  const validPayload = {
    email: 'valid@example.com',
    age: 25,
    role: 'USER',
    bio: 'Software engineer',
  };

  const maliciousFuzzInputs = [
    { field: 'email', value: '', expectedError: 'Email cannot be empty' },
    { field: 'email', value: 'not-an-email', expectedError: 'Invalid email format' },
    { field: 'email', value: 'a'.repeat(300) + '@test.com', expectedError: 'Email too long' },
    { field: 'email', value: 'admin@test.com\0.jpg', expectedError: 'Null byte detected' },
    { field: 'age', value: -1, expectedError: 'Age must be positive' },
    { field: 'age', value: 9999999999999999, expectedError: 'Age out of bounds' },
    { field: 'age', value: 'twenty-five', expectedError: 'Expected number, received string' },
    { field: 'role', value: 'SUPERADMIN', expectedError: 'Invalid enum value' },
    { field: 'role', value: { $ne: null }, expectedError: 'NoSQL injection object' },
    { field: 'bio', value: 'x'.repeat(100_000), expectedError: 'Payload too large' },
  ];

  maliciousFuzzInputs.forEach(({ field, value, expectedError }) => {
    it(`safely rejects invalid ${field} with 400/422 status`, async () => {
      const payload = { ...validPayload, [field]: value };

      const res = await request(app)
        .post('/api/v1/users')
        .send(payload);

      // Must never crash with 500
      expect([400, 422]).toContain(res.status);
      expect(res.body.error).toBeDefined();
      expect(res.body.stack).toBeUndefined(); // Never leak stack traces!
    });
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Execution Command
```bash
# Run API fuzz test suite
npm test -- --testPathPattern=fuzz
```

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


