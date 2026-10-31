---
name: agent-runtime-deadlock-and-liveness-auditor
description: "Use when detecting cyclic task waits, orchestrator deadlocks, unbounded blocking, starvation, and ensuring agent execution liveness."
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
  task_dependency_graph: "object"
  active_wait_matrix: "object"
outputs:
  deadlock_findings: "array"
  cyclic_wait_paths: "array"
  liveness_assurance_status: "string"
trigger:
  - "agent deadlock audit"
  - "cyclic wait detection"
  - "runtime liveness check"
  - "orchestration hang analysis"
  - "task starvation prevention"
  - "agent-runtime-deadlock-and-liveness-auditor"
---

# Agent Runtime Deadlock & Liveness Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing deadlocks and runtime liveness, inspect these 5 critical parameters:
1. **Cyclic Wait Dependency Detection**: Construct the directed wait-for graph ($A \to B \to C \to A$) and search for cycles using cycle detection algorithms.
2. **Lock Acquisition Ordering**: Verify that shared resources, workspace locks, and files are acquired in a consistent, total global order.
3. **Bounded Wait Timeouts**: Ensure all async waits, promise barriers, and child task joins incorporate hard timeout escape routes.
4. **Starvation & Priority Inversion**: Verify that high-priority security and review tasks are not starved by low-priority background workers.
5. **Deterministic Termination Guarantee**: Confirm that every workflow execution path is guaranteed to reach an explicit terminal state.

## Activation Boundaries
- **Activate when:** Investigating workflow hangs, analyzing multi-agent communication deadlocks, testing promise coordination, or auditing task DAGs.
- **DO NOT activate when:** Auditing single-file syntax mutations (use `mutation-testing-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Graph Extraction** | Map active agent-to-agent waits, sub-agent invocations, and synchronization locks. | Fast / Standard / Deep |
| **Pass 2** | **Cycle Analysis** | Execute DFS cycle detection across the dependency wait graph. | All Modes |
| **Pass 3** | **Lock Order Audit** | Inspect lock acquisition sequences across concurrent transaction managers. | Standard / Deep |
| **Pass 4** | **Unbounded Wait Inspection** | Identify promises and listeners lacking timeout or cancellation escape hatches. | All Modes |
| **Pass 5** | **Findings & Deadlock Resolution**| Emit `DEADLOCK_DETECTED` findings with exact cyclic paths and ordering remedies. | Standard / Deep |

## Verification Command
```bash
node -e "const { ResourceGuardEngine } = require('./src/runtime_reliability'); console.log('Deadlock engine operational');"
```
