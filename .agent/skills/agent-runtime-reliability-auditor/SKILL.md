---
name: agent-runtime-reliability-auditor
description: "Use when evaluating the complete agent execution lifecycle, identifying single points of failure, assessing timeout and retry boundaries, and auditing runtime resilience."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/index.js
  - src/runtime_reliability/state_machine_engine.js
inputs:
  workflow_manifest: "object"
  execution_telemetry: "object"
outputs:
  reliability_gap_report: "object"
  single_points_of_failure: "array"
  resilience_verdict: "string"
trigger:
  - "agent runtime reliability audit"
  - "agent execution lifecycle check"
  - "runtime resilience audit"
  - "single point of failure analysis"
  - "workflow fault tolerance"
  - "agent-runtime-reliability-auditor"
---

# Agent Runtime Reliability Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing agent runtime reliability, inspect these 5 critical parameters:
1. **Lifecycle Stage Completeness**: Trace task lifecycle through task creation, scheduling, execution, aggregation, and finalization.
2. **Failure Boundary Isolation**: Verify that an error in one agent or tool is isolated and does not cascade across independent reviewers.
3. **State Transition Conformity**: Ensure runtime states transition strictly within the 10 canonical lifecycle states without illegal jumps.
4. **Non-Masking Safety Invariant**: Guarantee that incomplete or failed runs are never reported as successful verifications ($\Delta\text{Critical} = 0$).
5. **Observability Traceability**: Confirm that execution IDs, correlation tokens, and failure categories are preserved across retries.

## Activation Boundaries
- **Activate when:** Evaluating end-to-end agent workflow reliability, analyzing orchestrator stability, reviewing multi-agent failure boundaries, or certifying production readiness.
- **DO NOT activate when:** Auditing code-level formal specifications (use `formal-specification-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Lifecycle Mapping** | Map orchestrator tasks, workers, scheduling queues, and state storage. | Fast / Standard / Deep |
| **Pass 2** | **Failure Boundary Audit** | Identify single points of failure, uncontained errors, and cascading crash vectors. | All Modes |
| **Pass 3** | **State Invariant Check** | Validate that execution state records conform to `ExecutionRecordSchema`. | Standard / Deep |
| **Pass 4** | **Partial & Timeout Analysis** | Verify behavior when tasks encounter deadlines, cancellations, or partial completions. | All Modes |
| **Pass 5** | **Resilience Gap Synthesis** | Emit structured `RuntimeFindingSchema` records with concrete architectural remedies. | Standard / Deep |

## Verification Command
```bash
node -e "const { StateMachineEngine } = require('./src/runtime_reliability'); console.log('State machine operational');"
```
