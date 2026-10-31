---
name: test-fixtures-factories
description: "Use when designing scalable test data fixtures, synthetic data generators, Object Mother patterns, and factory builders for deterministic test state."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
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
  - "test fixtures factories"
  - "test data factory"
  - "object mother pattern"
  - "synthetic test data"
  - "fishery factory"
  - "factory bot"
---

# Test Fixture & Synthetic Data Factory Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `test-fixtures-factories` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Review target domain entities and identify required vs optional attributes
2. **Runtime Context & Platform Invariants**: Ensure factories produce valid default states conforming to database and domain constraints
3. **Execution Guardrails**: Check for unique constraint fields (emails, usernames, IDs) and implement monotonic sequence counters
4. **Validation & Type Contracts**: Verify that factory builders support deep nested relationship overrides
5. **Observability & Proof of Execution**: Confirm whether factories build in-memory plain objects or persist to test databases

## Activation Boundaries
- **Activate when:** Use when designing scalable test data fixtures, synthetic data generators, Object Mother patterns, and factory builders for deterministic test state.
- **DO NOT activate when:** The task falls outside the `test-fixtures-factories` domain or is managed by a different dedicated specialist agent.

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
1. **A factory default object must always be valid**: `userFactory.build()` must pass all domain validations out of the box.
2. **Never hardcode unique fields**: always use incremental sequence counters (`seq => \`user_${seq}@domain.com\``) to avoid collision.
3. **Separate build (in-memory) from create (database persistence)**: in-memory builds should be instantaneous without DB overhead.
4. **Use explicit traits for domain-meaningful variations (`userFactory.admin().unverified().build()`) rather than scattered ad-hoc overrides.**: Use explicit traits for domain-meaningful variations (`userFactory.admin().unverified().build()`) rather than scattered ad-hoc overrides.

## Hallucination Traps (Read First)
❌ Storing massive static JSON fixture files with 1,000 lines of data → ✅ Use programmatic factories that declare only the attributes relevant to the test
❌ Sharing a single static user object across 20 tests that mutate it → ✅ Always generate fresh, immutable object instances for every test
❌ Hardcoding database foreign keys in factories → ✅ Lazy-build associated factories only when required by the test
❌ Relying on random generators (`faker.name.firstName()`) without a fixed seed for deterministic failures → ✅ Use sequence counters or seeded generators

---

### 1. Robust TypeScript Factory with Fishery Pattern
```typescript
import { Factory } from 'fishery';

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPPORT';
  isActive: boolean;
  createdAt: Date;
  profile: {
    fullName: string;
    avatarUrl?: string;
  };
}

export const userFactory = Factory.define<User>(({ sequence, params }) => {
  const id = `usr_${sequence}`;
  return {
    id,
    email: `user_${sequence}@test.company.com`,
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    profile: {
      fullName: `Test User ${sequence}`,
      avatarUrl: undefined,
    },
  };
});

// Defining reusable traits
export const adminUserFactory = userFactory.params({
  role: 'ADMIN',
});

export const deactivatedUserFactory = userFactory.params({
  isActive: false,
});
```

### 2. Usage in Unit & Integration Tests
```typescript
describe('User Permission Service', () => {
  it('allows active admin to delete resource', () => {
    // Only specify attributes relevant to this test!
    const admin = adminUserFactory.build({ id: 'usr_admin_1' });
    const targetUser = userFactory.build();

    expect(canDeleteUser(admin, targetUser)).toBe(true);
  });

  it('rejects deactivated admin from performing admin actions', () => {
    const inactiveAdmin = adminUserFactory.build({ isActive: false });
    const targetUser = userFactory.build();

    expect(canDeleteUser(inactiveAdmin, targetUser)).toBe(false);
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Quality Checks
1. Validate factory validity with a self-test:
   ```typescript
   it('factory generates valid default model', () => {
     const model = userFactory.build();
     expect(validateUserSchema(model).success).toBe(true);
   });
   ```
2. Verify uniqueness across 100 generated instances:
   ```typescript
   it('generates unique emails across sequences', () => {
     const users = userFactory.buildList(100);
     const emails = new Set(users.map(u => u.email));
     expect(emails.size).toBe(100);
   });
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


