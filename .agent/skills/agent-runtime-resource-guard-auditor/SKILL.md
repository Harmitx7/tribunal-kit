---
name: agent-runtime-resource-guard-auditor
description: "Use when verifying concurrency limits, bounded queue backpressure, token consumption budgets, output payload caps, and resource exhaustion controls."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/resource_guard_engine.js
  - src/runtime_reliability/index.js
inputs:
  resource_limits: "object"
  runtime_metrics: "object"
outputs:
  resource_findings: "array"
  backpressure_events: "array"
  resource_guard_status: "string"
trigger:
  - "runtime resource guard audit"
  - "concurrency limit check"
  - "queue backpressure verification"
  - "token budget exhaustion"
  - "output payload bounding"
  - "agent-runtime-resource-guard-auditor"
---

# Agent Runtime Resource Guard Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing runtime resource guards, inspect these 5 critical parameters:
1. **Concurrency Pool Caps**: Enforce maximum parallel task limits (`maxConcurrency`) to prevent CPU, socket, and memory starvation.
2. **Bounded Queue Backpressure**: Reject new tasks with `RESOURCE_EXHAUSTED` when queue capacity (`maxQueueDepth`) is saturated rather than buffering indefinitely.
3. **Payload & Memory Bounding**: Truncate and clamp oversized tool outputs and model responses to prevent heap Out-Of-Memory crashes.
4. **Token Consumption Accounting**: Track cumulative LLM token consumption against defined budget thresholds.
5. **Resource Leak Detection**: Verify that allocated concurrency slots and buffer references are freed upon task completion, timeout, or cancellation.

## Activation Boundaries
- **Activate when:** Auditing worker pools, testing load-shedding mechanisms, checking token budget enforcement, or evaluating backpressure handling.
- **DO NOT activate when:** Auditing dependency cycles between agents (use `agent-runtime-deadlock-and-liveness-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Budget & Limit Extraction** | Collect concurrency thresholds, queue depth limits, and token budgets. | Fast / Standard / Deep |
| **Pass 2** | **Saturation Testing** | Test behavior when submitted tasks exceed concurrency and queue bounds. | All Modes |
| **Pass 3** | **Memory & Payload Audit** | Check output bounding functions against large synthetic responses (e.g. >500KB). | Standard / Deep |
| **Pass 4** | **Slot Leak Inspection** | Verify slot release in `finally` blocks during errors, timeouts, and aborts. | All Modes |
| **Pass 5** | **Findings & Metric Synthesis** | Emit `RESOURCE_EXHAUSTION` findings with bounded queue and slot recommendations. | Standard / Deep |

## Verification Command
```bash
node -e "const { ResourceGuardEngine } = require('./src/runtime_reliability'); console.log('Resource guard operational');"
```
