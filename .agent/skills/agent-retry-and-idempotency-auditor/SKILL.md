---
name: agent-retry-and-idempotency-auditor
description: "Use when preventing retry storms, enforcing bounded exponential backoff with jitter, verifying side-effect idempotency, and honoring rate limits."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/retry_and_timeout_engine.js
  - src/runtime_reliability/failure_classifier.js
  - src/runtime_reliability/index.js
inputs:
  retry_policy: "object"
  task_operations: "array"
outputs:
  retry_safety_findings: "array"
  idempotency_violations: "array"
  backoff_compliance_status: "string"
trigger:
  - "agent retry audit"
  - "idempotency verification"
  - "exponential backoff check"
  - "retry storm prevention"
  - "rate limit retry after"
  - "agent-retry-and-idempotency-auditor"
---

# Agent Retry & Idempotency Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing retries and idempotency, inspect these 5 critical parameters:
1. **Side-Effect Safety**: Classify every retried operation as idempotent (safe to retry) or non-idempotent (prohibited without idempotency key).
2. **Full Jitter Exponential Backoff**: Ensure retry delays incorporate full randomization to prevent synchronized thundering herds.
3. **Total Retry Deadline Cap**: Prevent unbounded retry loops by enforcing an overarching cumulative retry deadline (`retryDeadlineMs`).
4. **Rate-Limit Hint Adherence**: Respect `Retry-After` response headers from external LLM providers and web endpoints.
5. **Non-Retryable Category Recognition**: Halt immediately on non-retryable errors (`AUTHORIZATION_FAILURE`, `INVALID_INPUT`).

## Activation Boundaries
- **Activate when:** Reviewing task retry configurations, auditing API mutation side effects, analyzing rate-limit handling, or preventing retry storms.
- **DO NOT activate when:** Auditing state machine transition integrity (use `agent-state-machine-integrity-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Operation Classification** | Categorize task actions by mutation impact (read-only vs state-modifying). | Fast / Standard / Deep |
| **Pass 2** | **Backoff & Jitter Evaluation**| Validate mathematical backoff formulas, initial delays, max delays, and jitter logic. | All Modes |
| **Pass 3** | **Idempotency Token Audit** | Verify presence of deduplication tokens and cache lookup safeguards. | Standard / Deep |
| **Pass 4** | **Rate-Limit & Deadline Audit** | Test behavior under HTTP 429 responses and cumulative retry deadline expiration. | All Modes |
| **Pass 5** | **Findings & Policy Synthesis** | Emit `NON_IDEMPOTENT_RETRY` or `UNBOUNDED_RETRY` findings with safe backoff policies. | Standard / Deep |

## Verification Command
```bash
node -e "const { RetryAndTimeoutEngine } = require('./src/runtime_reliability'); console.log('Retry engine operational');"
```
