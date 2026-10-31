---
name: k6-performance-testing
description: "Use when authoring, running, and analyzing load, stress, spike, and soak performance tests with Grafana k6, measuring latency percentiles and throughput."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - backend-performance-auditor
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
  - "k6 performance testing"
  - "load testing k6"
  - "stress testing"
  - "spike testing"
  - "soak testing"
  - "latency percentile threshold"
---

# Grafana k6 Load & Performance Testing Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `k6-performance-testing` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Identify target system baseline performance expectations and SLA percentiles (p95, p99)
2. **Runtime Context & Platform Invariants**: Confirm test environment isolation to prevent noisy neighbor skewing results
3. **Execution Guardrails**: Ensure test data fixtures exist in target test database without exhausting unique IDs
4. **Validation & Type Contracts**: Verify that rate limiters and WAFs are configured with test bypass tokens if simulating high VUs
5. **Observability & Proof of Execution**: Establish abort triggers if error rate exceeds 5% during ramp-up

## Activation Boundaries
- **Activate when:** Use when authoring, running, and analyzing load, stress, spike, and soak performance tests with Grafana k6, measuring latency percentiles and throughput.
- **DO NOT activate when:** The task falls outside the `k6-performance-testing` domain or is managed by a different dedicated specialist agent.

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
1. **Always configure explicit threshold gates**: tests must fail automatically in CI if p95 latency or error rates exceed SLOs.
2. **Ramp virtual users gradually**: never shock systems immediately with peak load unless explicitly running a Spike Test.
3. **Separate cold-start performance from steady-state**: use warmup stages before collecting benchmark metrics.
4. **Include realistic think time (`sleep(Math.random() * 2 + 1)`) to accurately simulate human user traffic patterns.**: Include realistic think time (`sleep(Math.random() * 2 + 1)`) to accurately simulate human user traffic patterns.

## Hallucination Traps (Read First)
❌ Running load tests against production databases without isolated tenant or mock credentials → ✅ Run against dedicated perf environment or ephemeral test database
❌ Evaluating performance on average latency alone → ✅ Always measure p95, p99, and max latencies to catch tail latency degradation
❌ Ignoring connection exhaustion in the test client → ✅ Tune local OS ephemeral ports and file descriptor limits before high-VU runs
❌ Failing to clean up generated test records after load test execution → ✅ Use teardown hooks or isolated tenant accounts that can be wiped

---

### 1. Production-Grade k6 Load Test Scenario
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('custom_error_rate');
const checkoutDuration = new Trend('checkout_duration_ms');

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 VUs
    { duration: '2m', target: 50 },   // Steady load
    { duration: '30s', target: 150 }, // Spike to 150 VUs
    { duration: '1m', target: 150 },  // Peak load
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<800'], // 95% of requests < 300ms
    'custom_error_rate': ['rate<0.01'],              // Error rate < 1%
    'checkout_duration_ms': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-perf-token',
    },
  };

  const payload = JSON.stringify({
    items: [{ id: 'sku_123', quantity: 1 }],
    timestamp: Date.now(),
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/checkout`, payload, params);
  const duration = Date.now() - start;

  checkoutDuration.add(duration);

  const success = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response has orderId': (r) => JSON.parse(r.body).orderId !== undefined,
  });

  errorRate.add(!success);

  // Realistic human think time: 1 to 3 seconds
  sleep(Math.random() * 2 + 1);
}
```

---

## Diagnostic Procedures & Verification Commands
### Execution & Analysis
1. Run load test locally with headless runner:
   ```bash
   k6 run --env TARGET_URL=http://localhost:3000 tests/perf/checkout_load.js
   ```
2. Run automated stress test with summary JSON output:
   ```bash
   k6 run --summary-export=summary.json tests/perf/checkout_load.js
   ```
3. Verify threshold pass/fail exit code (exits non-zero on threshold violation).

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


