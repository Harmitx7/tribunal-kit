---
name: agent-runtime-regression-auditor
description: "Use when detecting runtime latency, failure rate, retry count, or cancellation regressions across software revisions, model updates, and configuration changes."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/index.js
inputs:
  baseline_metrics: "object"
  candidate_metrics: "object"
outputs:
  regression_findings: "array"
  delta_latency_ms: "number"
  delta_failure_rate: "number"
  regression_gate_verdict: "string"
trigger:
  - "agent runtime regression audit"
  - "runtime latency regression"
  - "failure rate increase check"
  - "retry count regression"
  - "resilience baseline comparison"
  - "agent-runtime-regression-auditor"
---

# Agent Runtime Regression Auditor

## Mandatory Pre-Flight Context Inspection
Before certifying runtime changes against regressions, inspect these 5 critical parameters:
1. **Versioned Baseline Comparison**: Compare candidate execution metrics against an authoritative, committed baseline revision.
2. **Multi-Dimensional Metrics Tracking**: Evaluate completion rate, error distribution, median/p95 latency, retry frequency, and timeout count.
3. **Environmental vs Code Disambiguation**: Differentiate intermittent external infrastructure hiccups from code-induced regressions.
4. **Safety Regression Prohibition ($\Delta\text{Critical} = 0$)**: Reject candidate releases if any critical safety invariant, failure handling, or cancellation check degrades.
5. **No Average Masking**: Prevent improved average latencies from concealing extreme p99 tails or new catastrophic hang scenarios.

## Activation Boundaries
- **Activate when:** Evaluating PRs impacting the execution runtime, updating LLM models or system prompts, modifying orchestrators, or pre-release testing.
- **DO NOT activate when:** Auditing software dependencies (use `dependency-update-risk-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Baseline Extraction** | Load historical benchmark telemetry for the baseline git commit and revision. | Fast / Standard / Deep |
| **Pass 2** | **Candidate Evaluation** | Ingest candidate execution metrics across identical standard workloads. | All Modes |
| **Pass 3** | **Delta Computation** | Calculate $\Delta\text{Latency}$, $\Delta\text{Failures}$, $\Delta\text{Retries}$, and $\Delta\text{Timeouts}$. | Standard / Deep |
| **Pass 4** | **Safety Invariant Check** | Verify that no previously passing error or cancellation scenario now fails. | All Modes |
| **Pass 5** | **Findings & Regression Verdict**| Emit `RUNTIME_REGRESSION` findings or certify non-regressive release readiness. | Standard / Deep |

## Verification Command
```bash
node -e "const { executeResilientWorkflow } = require('./src/runtime_reliability'); console.log('Runtime workflow operational');"
```
