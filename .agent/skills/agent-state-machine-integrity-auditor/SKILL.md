---
name: agent-state-machine-integrity-auditor
description: "Use when verifying finite state machine transitions, preventing illegal state jumps, eliminating duplicate finalization, and auditing execution records."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/state_machine_engine.js
  - src/runtime_reliability/execution_state_schemas.js
  - src/runtime_reliability/index.js
inputs:
  state_transitions_log: "array"
  execution_record: "object"
outputs:
  illegal_transition_findings: "array"
  terminal_state_violations: "array"
  fsm_integrity_status: "string"
trigger:
  - "state machine integrity audit"
  - "illegal state transition check"
  - "duplicate finalization prevention"
  - "execution lifecycle verification"
  - "fsm transition table audit"
  - "agent-state-machine-integrity-auditor"
---

# Agent State Machine Integrity Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing state machine transitions, inspect these 5 critical parameters:
1. **Canonical State Table Alignment**: Verify that all execution states belong to the 10 canonical lifecycle states.
2. **Terminal State Immutability**: Enforce that terminal states (`SUCCEEDED`, `FAILED`, `TIMED_OUT`, `CANCELLED`, `PARTIAL`) have zero allowed outbound transitions.
3. **Duplicate Finalization Defense**: Prevent multiple conflicting terminal calls (e.g. attempting to complete an already failed or cancelled task).
4. **Transition Audit Trail**: Maintain an immutable log of state transitions with ISO timestamps, attempt numbers, and transition reasons.
5. **Fail-Closed on Unknown States**: Immediately halt execution and flag `ILLEGAL_STATE_TRANSITION` if an unrecognized state is encountered.

## Activation Boundaries
- **Activate when:** Inspecting task execution logs, testing orchestrator state management, verifying race conditions in task finalization, or auditing FSM models.
- **DO NOT activate when:** Auditing persistent disk recovery checkpoints (use `agent-recovery-and-resume-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Transition Extraction** | Extract recorded state transitions, timestamps, and caller identities. | Fast / Standard / Deep |
| **Pass 2** | **Legal Matrix Validation** | Compare each transition pair against `LEGAL_TRANSITIONS` rules. | All Modes |
| **Pass 3** | **Terminal Mutation Check** | Detect any attempt to transition or mutate tasks already in terminal states. | Standard / Deep |
| **Pass 4** | **Concurrency & Lock Audit** | Verify that state updates are protected against concurrent interleaving. | All Modes |
| **Pass 5** | **Findings & FSM Certification**| Output `ILLEGAL_STATE_TRANSITION` findings with trace paths and corrective models. | Standard / Deep |

## Verification Command
```bash
node -e "const { StateMachineEngine } = require('./src/runtime_reliability'); console.log('State machine integrity validated');"
```
