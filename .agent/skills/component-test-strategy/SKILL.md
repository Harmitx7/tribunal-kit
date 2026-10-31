---
name: component-test-strategy
description: "Use when authoring resilient component tests with Testing Library and Vitest, testing user interactions over implementation details, and avoiding DOM query traps."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - webapp-testing
  - better-ui
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
  - "component test strategy"
  - "react testing library test"
  - "component testing vitest"
  - "user event testing"
  - "testing library query priority"
  - "ui component testing"
---

# Component Testing & User-Event Strategy

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `component-test-strategy` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm accessible query priority order: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
2. **Runtime Context & Platform Invariants**: Verify user interactions use `userEvent.setup()` over outdated `fireEvent`
3. **Execution Guardrails**: Ensure asynchronous state changes are asserted using `findBy*` or `waitFor`
4. **Validation & Type Contracts**: Check that component mock boundaries are established at network/service level, not internal hook level
5. **Observability & Proof of Execution**: Confirm unmounted component cleanup in `afterEach` to prevent DOM pollution

## Activation Boundaries
- **Activate when:** Use when authoring resilient component tests with Testing Library and Vitest, testing user interactions over implementation details, and avoiding DOM query traps.
- **DO NOT activate when:** The task falls outside the `component-test-strategy` domain or is managed by a different dedicated specialist agent.

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
1. **The more your tests resemble the way your software is used, the more confidence they can give you.**: The more your tests resemble the way your software is used, the more confidence they can give you.
2. **Query elements by accessible roles (getByRole('button', { name**: /submit/i })) to simultaneously test functionality and accessibility.
3. **Never test internal component state (wrapper.state()) or private methods**: test rendered output and emitted events.
4. **Always use @testing-library/user-event for clicks and typing**: it accurately simulates mouse moves, focus, keydowns, and blur.

## Hallucination Traps (Read First)
❌ Querying elements by CSS classes (container.querySelector('.submit-btn')) → ✅ Query by accessible role: screen.getByRole('button', { name: /submit/i })
❌ Using fireEvent.click(btn) which bypasses disabled checks → ✅ Use await user.click(btn) which respects disabled state
❌ Wrapping entire test blocks in await waitFor(() => ...) → ✅ Use await screen.findByRole(...) for async elements
❌ Mocking child components prematurely → ✅ Render full component trees unless testing heavy third-party integrations (e.g. Google Maps, Canvas)

---

### 1. Robust React Component Test with userEvent
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm Component', () => {
  it('submits form with user inputs and handles async success', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });

    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Accessible queries!
    const emailInput = screen.getByRole('textbox', { name: /email address/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Simulate realistic user typing and click
    await user.type(emailInput, 'dev@example.com');
    await user.type(passwordInput, 'Secret123!');
    await user.click(submitButton);

    // Verify loading state
    expect(submitButton).toBeDisabled();

    // Verify submission called with correct payload
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'dev@example.com',
      password: 'Secret123!',
    });

    // Assert asynchronous success message appears in DOM
    const successBanner = await screen.findByRole('alert');
    expect(successBanner).toHaveTextContent(/welcome back/i);
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Test Execution
```bash
npx vitest run src/components/LoginForm.spec.tsx
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


