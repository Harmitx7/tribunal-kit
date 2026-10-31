---
name: chaos-fault-injection
description: "Use when testing system resilience, simulating network latency, socket hangups, HTTP 500/503 errors, and verifying circuit breaker and retry mechanisms."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - error-resilience
  - api-patterns
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
  - "chaos fault injection"
  - "chaos testing"
  - "fault injection testing"
  - "circuit breaker verification"
  - "simulated network latency"
  - "socket hangup testing"
---

# Chaos & Fault-Injection Resilience Testing

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `chaos-fault-injection` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify fallback mechanisms exist before injecting failures into dependencies
2. **Runtime Context & Platform Invariants**: Configure proxy or mock interceptor (e.g. Toxiproxy, MSW, or custom middleware)
3. **Execution Guardrails**: Confirm circuit breaker thresholds (error rate, trip duration, half-open probe count)
4. **Validation & Type Contracts**: Ensure test assertions verify graceful degradation rather than unhandled server crashes
5. **Observability & Proof of Execution**: Inspect exponential backoff and jitter algorithms to avoid thundering herd during recovery

## Activation Boundaries
- **Activate when:** Use when testing system resilience, simulating network latency, socket hangups, HTTP 500/503 errors, and verifying circuit breaker and retry mechanisms.
- **DO NOT activate when:** The task falls outside the `chaos-fault-injection` domain or is managed by a different dedicated specialist agent.

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
1. **Never allow dependency failure to bring down the host application**: failures must be caught by circuit breakers or fallbacks.
2. **Test both trip and recovery**: verify the circuit trips to OPEN on failure and resets to CLOSED after recovery.
3. **Enforce bounded timeouts**: every outgoing network request must have an explicit timeout (`timeout: 3000`).
4. **Never retry non-idempotent operations (`POST /charges`) without unique idempotency keys.**: Never retry non-idempotent operations (`POST /charges`) without unique idempotency keys.

## Hallucination Traps (Read First)
❌ Infinite retry loops on 500 Internal Server Error → ✅ Use exponential backoff with max 3 retries and full jitter
❌ Retrying 4xx client errors (400, 401, 404, 422) → ✅ Only retry transient 5xx errors or network socket timeouts
❌ Hardcoding circuit breaker state in static variables across worker processes → ✅ Store circuit breaker states in Redis or process memory boundaries
❌ Failing to test socket hangups or slow byte streams (slowloris) → ✅ Explicitly test responses that pause mid-chunk

---

### 1. Circuit Breaker Resilience Test with MSW Fault Injection
```typescript
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { PaymentGatewayClient } from '../../src/services/payment';
import { CircuitBreakerOpenError } from '../../src/errors';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Payment Service Fault Injection', () => {
  it('trips circuit breaker after 3 consecutive 503 Service Unavailable responses', async () => {
    const client = new PaymentGatewayClient({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      requestTimeoutMs: 500,
    });

    // Inject 503 failure into payment endpoint
    server.use(
      http.post('https://api.payment-provider.com/v1/charge', () => {
        return new HttpResponse(null, { status: 503, statusText: 'Service Unavailable' });
      })
    );

    // First 3 calls fail with 503 and are retried
    await expect(client.charge(100)).rejects.toThrow('Service Unavailable');
    await expect(client.charge(100)).rejects.toThrow('Service Unavailable');
    await expect(client.charge(100)).rejects.toThrow('Service Unavailable');

    // 4th call must immediately fail FAST with CircuitBreakerOpenError without touching network!
    await expect(client.charge(100)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('handles network latency timeout gracefully with fallback cache', async () => {
    const client = new PaymentGatewayClient({ requestTimeoutMs: 200 });

    // Inject 2000ms latency on 200ms timeout
    server.use(
      http.get('https://api.payment-provider.com/v1/rates', async () => {
        await delay(2000);
        return HttpResponse.json({ rate: 1.25 });
      })
    );

    const rates = await client.getExchangeRatesWithFallback();
    expect(rates.source).toBe('FALLBACK_STALE_CACHE');
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Chaos Verification Protocol
1. Run fault injection test suite:
   ```bash
   npm test -- --testPathPattern=chaos
   ```
2. Verify metrics and logs emit circuit breaker state transitions:
   - `CIRCUIT_TRIPPED: payment-gateway`
   - `FALLBACK_ACTIVATED: exchange-rates`
   - `CIRCUIT_RESET: payment-gateway`

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


