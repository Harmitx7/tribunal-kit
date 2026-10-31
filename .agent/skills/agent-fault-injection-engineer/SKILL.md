---
name: agent-fault-injection-engineer
description: "Use when designing and running isolated chaos tests, simulating timeouts, network drops, rate limits, crashes, and verifying runtime self-healing."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/fault_injection_engine.js
  - src/runtime_reliability/index.js
inputs:
  fault_scenarios: "array"
  target_components: "array"
outputs:
  fault_injection_results: "array"
  recovery_metrics: "object"
  chaos_certification_status: "string"
trigger:
  - "agent fault injection"
  - "chaos testing"
  - "simulated network drop"
  - "simulated rate limit"
  - "in-process fault injection"
  - "agent-fault-injection-engineer"
---

# Agent Fault Injection Engineer

## Mandatory Pre-Flight Context Inspection
Before conducting fault injection tests, inspect these 5 critical parameters:
1. **Strict Air-Gapped Isolation**: Ensure all injected faults run exclusively in isolated test harnesses; zero calls to external production endpoints.
2. **Deterministic Seed Reproducibility**: Configure fault injection rules with explicit, deterministic iteration counts and failure conditions.
3. **Comprehensive Vector Coverage**: Test timeouts, network disconnects (`ECONNRESET`), HTTP 429 rate limits, malformed JSON, and tool crashes.
4. **State Machine Invariant Verification**: Verify that injected faults drive state machines only through legal transitions.
5. **Deterministic Cleanup**: Guarantee that all active injection rules, mock hooks, and timer intervals are cleanly reset after test execution.

## Activation Boundaries
- **Activate when:** Conducting chaos engineering, stress-testing retry mechanisms, validating cancellation races, or pre-release certification.
- **DO NOT activate when:** Auditing production code without test harness isolation.

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Scenario Definition** | Define test cases with target methods, failure categories, and expected retries. | Fast / Standard / Deep |
| **Pass 2** | **Harness Initialization** | Configure `FaultInjectionEngine` with targeted rule counts and parameters. | All Modes |
| **Pass 3** | **Fault Interception** | Intercept target methods and trigger deterministic errors during task execution. | Standard / Deep |
| **Pass 4** | **Recovery Verification** | Observe whether the runtime retries, backs off, falls back, or fails closed as expected. | All Modes |
| **Pass 5** | **Findings & Reset** | Reset injection rules and emit comprehensive fault resilience scorecard. | Standard / Deep |

## Verification Command
```bash
node -e "const { FaultInjectionEngine } = require('./src/runtime_reliability'); console.log('Fault injection engine operational');"
```
