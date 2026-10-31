---
name: api-contract-testing
description: "Use when validating API contracts, verifying consumer-driven contracts with Pact, preventing breaking changes, and enforcing OpenAPI schema conformance."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - api-patterns
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "api contract testing"
  - "consumer driven contracts"
  - "pact testing"
  - "contract verification"
  - "breaking api change prevention"
  - "openapi contract test"
---

# API & Consumer-Driven Contract Testing Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `api-contract-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm contract specification format (Pact v3/v4, OpenAPI 3.1, or AsyncAPI 3.0)
2. **Runtime Context & Platform Invariants**: Inspect consumer expectations and ensure provider state handlers are defined
3. **Execution Guardrails**: Verify whether API gateway schema validation is enabled for incoming payloads
4. **Validation & Type Contracts**: Check backward compatibility rules for response payloads and query parameters
5. **Observability & Proof of Execution**: Ensure contract test execution runs in CI before provider artifact deployment

## Activation Boundaries
- **Activate when:** Use when validating API contracts, verifying consumer-driven contracts with Pact, preventing breaking changes, and enforcing OpenAPI schema conformance.
- **DO NOT activate when:** The task falls outside the `api-contract-testing` domain or is managed by a different dedicated specialist agent.

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
1. **Never break existing consumer contracts**: fields can be added, but existing fields cannot be removed or have their types altered without consumer versioning.
2. **Always test both Consumer and Provider sides**: Consumers generate contract pacts; Providers verify pacts against their active implementations.
3. **Every Provider state handler must run in an isolated test boundary with deterministic test data fixtures.**: Every Provider state handler must run in an isolated test boundary with deterministic test data fixtures.
4. **Status codes and error payload schemas are first-class contract citizens**: 400, 401, 403, 404, 422, and 500 responses must adhere to RFC 9457 Problem Details.

## Hallucination Traps (Read First)
❌ Testing live network endpoints in consumer contract generation → ✅ Mock the provider in consumer tests using Pact mock service
❌ Using hardcoded timestamps or randomized UUIDs in contract assertions → ✅ Use Pact matchers (like `like()`, `iso8601DateTime()`, `uuid()`)
❌ Verifying provider against outdated pact files → ✅ Fetch the latest verified pacts from a Pact Broker using consumer version selectors
❌ Treating OpenAPI specification as proof of implementation → ✅ Execute automated contract tests verifying actual server responses against the OpenAPI spec

---

### 1. Consumer Contract Definition with Pact (TypeScript)
```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
const { like, uuid, iso8601DateTime } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-checkout-frontend',
  provider: 'order-processing-service',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Order Service Contract', () => {
  it('creates an order with valid payment', () => {
    return provider
      .uponReceiving('a request to create a payment order')
      .withRequest({
        method: 'POST',
        path: '/api/v1/orders',
        headers: { 'Content-Type': 'application/json' },
        body: {
          customerId: 'cust_12345',
          amountCents: 4999,
          currency: 'USD',
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          orderId: uuid('d3b07384-d113-4a69-8134-2e90f6b3d4f5'),
          status: like('CONFIRMED'),
          createdAt: iso8601DateTime('2026-10-27T10:00:00Z'),
        },
      })
      .executeTest(async (mockServer) => {
        const client = new OrderClient(mockServer.url);
        const order = await client.createOrder({
          customerId: 'cust_12345',
          amountCents: 4999,
          currency: 'USD',
        });
        expect(order.status).toBe('CONFIRMED');
      });
  });
});
```

### 2. Provider Verification State Handlers
```typescript
import { Verifier } from '@pact-foundation/pact';

describe('Pact Provider Verification', () => {
  it('validates against published consumer pacts', async () => {
    const verifier = new Verifier({
      provider: 'order-processing-service',
      providerBaseUrl: 'http://localhost:8080',
      pactUrls: [path.resolve(__dirname, '../../pacts/web-checkout-frontend-order-processing-service.json')],
      stateHandlers: {
        'customer cust_12345 exists and has sufficient balance': async () => {
          await db.seedCustomer({ id: 'cust_12345', balanceCents: 100000 });
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Verification & CI Gates
1. Run consumer contract tests:
   ```bash
   npm test -- --testPathPattern=contract
   ```
2. Verify Provider against consumer contracts:
   ```bash
   npm run test:pact:verify
   ```
3. Check breaking changes against OpenAPI schema with oasdiff:
   ```bash
   oasdiff breaking base_openapi.yaml current_openapi.yaml
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


