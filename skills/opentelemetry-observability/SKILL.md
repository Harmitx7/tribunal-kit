---
name: opentelemetry-observability
description: Use when Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - observability
  - performance-profiling
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# OpenTelemetry Observability — 2026 Telemetry Standards

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `opentelemetry-observability` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation.
- **DO NOT activate when:** The task falls outside the `opentelemetry-observability` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

## Custom Trace & Meter Instrumentation (TypeScript)

```typescript
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('user-service', '1.0.0');
const meter = metrics.getMeter('user-service', '1.0.0');

const loginCounter = meter.createCounter('user_logins_total', {
  description: 'Counts total user login attempts',
});

export async function handleLogin(userId: string) {
  return tracer.startActiveSpan('handleLogin', async span => {
    try {
      span.setAttribute('user.id', userId);
      loginCounter.add(1, { status: 'success' });
      // Business logic...
      span.setStatus({ code: 1 }); // OK
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message }); // Error
      throw err;
    } finally {
      span.end();
    }
  });
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Silent Pipeline Failure** | Executing shell steps without set -euo pipefail, ignoring errors | Always initialize shell scripts with set -euo pipefail and trap handlers |
| **Unpinned Dependency Shift** | Installing packages with npm install or using :latest docker tags | Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests |
| **Leaking Build Secrets** | Passing secrets as Docker build arguments baked into image layers | Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are strict execution modes (set -euo pipefail) active on all scripts?
✅ Are container images pinned to digest/immutable tags instead of "latest"?
✅ Are deployment health checks and rollback baselines configured?
✅ Are CI secrets masked and unexposed to untrusted pull requests?
✅ Did I verify environment compatibility across target runtimes?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
