---
name: webapp-testing
description: "Use when writing, maintaining, executing, and auditing webapp testing test suites, assertions, mocks, and verification gates."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - testing-patterns
  - playwright-best-practices
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Webapp Testing — Full Stack Pipeline Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `webapp-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when writing, maintaining, executing, and auditing webapp testing test suites, assertions, mocks, and verification gates.
- **DO NOT activate when:** The task falls outside the `webapp-testing` domain or is managed by a different dedicated specialist agent.


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

## Hallucination Traps (Read First)

- ❌ Mocking everything in integration tests -> ✅ Integration tests verify real interactions; mock only external services (APIs, DBs)
- ❌ Testing Library: using `getByTestId` as the primary selector -> ✅ Prefer `getByRole`, `getByLabelText`, `getByText` for user-centric testing
- ❌ Writing E2E tests that depend on seed data -> ✅ Each test should create its own data in setup and clean up in teardown

---
## 1. The Strategy (The Testing Trophy)

The traditional "Testing Pyramid" (lots of Unit, little E2E) is outdated for rich UI applications. Use the **Testing Trophy**:

1. **Static Analysis (10%)**: TypeScript, ESLint, Prettier (Catches typos and type mismatches instantly).
2. **Unit Tests (20%)**: Vitest (Tests complex pure functions: math, formatting, data mapping).
3. **Integration Tests (60%)**: React Testing Library + MSW (Tests components and network mock interactions together).
4. **End-to-End Tests (10%)**: Playwright (Tests the critical path: Login, Checkout, Account Creation on a real browser).

---

## 2. Integration Layer (React Testing Library + MSW)

Do not mock child components. Render the specific DOM tree and interact with it as a user would.

To prevent network calls, utilize Mock Service Worker (MSW) which intercepts requests at the network layer natively.

```typescript
// ❌ BAD: Mocking implementation details
jest.mock('axios');
axios.get.mockResolvedValue({ data: { users: [] } });

// ✅ GOOD: MSW (Mock Service Worker) network level interception
// The component functions EXACTLY as it would in production
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'John Appleseed' }]);
  }),
];
const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Testing (RTL)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('Should load users and render names', async () => {
  // userEvent closely replicates real browser physics (focusing, keystrokes)
  const user = userEvent.setup();

  render(<UserDashboard />);

  // Initial State
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // Async Resolution (Auto-waits for the MSW mock to return)
  const johnNode = await screen.findByText('John Appleseed');
  expect(johnNode).toBeInTheDocument();

  // Interaction
  const deleteBtn = screen.getByRole('button', { name: "Delete John" });
  await user.click(deleteBtn);

  // Verification
  expect(johnNode).not.toBeInTheDocument();
});
```

---

## 3. Pure Unit Testing (Vitest)

Isolate business logic entirely from React.

```typescript
// ✅ Move complex logic OUT of the React component entirely
export function calculateTax(subtotal: number, state: string): number {
  if (subtotal < 0) throw new Error('Subtotal cannot be negative');
  if (state === 'CA') return subtotal * 0.0825;
  return 0; // Default
}

// ✅ Test with extreme precision and coverage
import { describe, it, expect } from 'vitest';

describe('calculateTax()', () => {
  it('applies CA tax correctly', () => {
    expect(calculateTax(100, 'CA')).toBe(8.25);
  });

  it('throws on negative input', () => {
    expect(() => calculateTax(-50, 'CA')).toThrowError('negative');
  });
});
```

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
