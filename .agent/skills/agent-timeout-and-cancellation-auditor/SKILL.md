---
name: agent-timeout-and-cancellation-auditor
description: "Use when verifying deadline enforcement, timeout boundaries, hierarchical cancellation propagation, and preventing orphaned processes."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/cancellation_context.js
  - src/runtime_reliability/index.js
inputs:
  execution_context: "object"
  task_deadlines: "object"
outputs:
  cancellation_findings: "array"
  orphaned_processes: "array"
  timeout_compliance_verdict: "string"
trigger:
  - "agent timeout audit"
  - "cancellation propagation check"
  - "orphaned process detection"
  - "execution deadline enforcement"
  - "abort signal handling"
  - "agent-timeout-and-cancellation-auditor"
---

# Agent Timeout & Cancellation Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing timeouts and cancellations, inspect these 5 critical parameters:
1. **Deadline Ownership**: Verify that every task and subprocess has an explicit, bounded timeout budget.
2. **Downward Cancellation Propagation**: Confirm that cancelling a parent workflow aborts child agents, network calls, and tool subprocesses.
3. **Orphaned Process Prevention**: Ensure child process handles are tracked and terminated via registered cleanup hooks upon cancellation.
4. **Distinction of Causes**: Distinguish logical user cancellations (`CANCELLED`) from deadline expirations (`TIMEOUT`).
5. **No Success on Cancellation**: Guarantee that a cancelled task is never falsely recorded as completed or successful.

## Activation Boundaries
- **Activate when:** Auditing long-running agent workflows, testing AbortSignal propagation, inspecting subprocess termination, or evaluating deadline enforcement.
- **DO NOT activate when:** Auditing multi-agent consensus quorums (use `multi-agent-partial-failure-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Deadline Discovery** | Extract declared timeout budgets for workflows, model requests, and tools. | Fast / Standard / Deep |
| **Pass 2** | **Signal Tree Inspection** | Trace `AbortController` and `CancellationContext` inheritance through task trees. | All Modes |
| **Pass 3** | **Cleanup Hook Verification** | Verify that `onCancel` hooks kill subprocesses and release acquired locks. | Standard / Deep |
| **Pass 4** | **Race Condition Testing** | Assess race conditions between completion finalization and timeout firing. | All Modes |
| **Pass 5** | **Findings & Verdict Synthesis** | Emit findings for `TIMEOUT_EXCEEDED` or `ORPHANED_SUBPROCESS` defects. | Standard / Deep |

## Verification Command
```bash
node -e "const { CancellationContext } = require('./src/runtime_reliability'); console.log('Cancellation context operational');"
```
