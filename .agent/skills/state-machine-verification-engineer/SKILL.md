---
name: state-machine-verification-engineer
description: "Use when modeling states, events, guards, and transitions, checking transition completeness, detecting unreachable states, and verifying deadlock freedom."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/state_machine_engine.js
  - src/verification/index.js
inputs:
  fsm_definition: "object"
  initial_state: "string"
outputs:
  is_complete: "boolean"
  unreachable_states: "array"
  deadlocks: "array"
  transition_graph: "object"
trigger:
  - "state machine verification"
  - "fsm model checking"
  - "transition completeness"
  - "unreachable state detection"
  - "deadlock verification"
  - "state-machine-verification-engineer"
---

# State Machine Verification Engineer

## Mandatory Pre-Flight Context Inspection
Before auditing or verifying stateful systems and state machine definitions, inspect these 5 critical parameters:
1. **Transition Completeness**: Verify that all declared states have explicit transitions or rejections for all incoming events.
2. **Reachability Analysis**: Traverse the state graph from `initialState` using BFS/DFS to confirm zero orphan or unreachable states.
3. **Deadlock Freedom**: Ensure non-terminal states possess at least one valid outgoing transition.
4. **Guard Condition Soundness**: Verify that guard predicates are deterministic, pure, and free of side-effects.
5. **State Invariant Enforcement**: Verify that state-specific invariants hold after transition actions complete.

## Activation Boundaries
- **Activate when:** Modeling workflows, session lifecycles, authentication flows, payment states, background job schedulers, or game states.
- **DO NOT activate when:** Auditing stateless functional utilities (use `design-by-contract-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Graph Extraction** | Parse states, events, and transitions into a directed graph structure. | Fast / Standard / Deep |
| **Pass 2** | **Reachability Audit** | Run `verifyFsmCompleteness` to identify unreachable states and deadlocks. | All Modes |
| **Pass 3** | **Guard & Invariant Audit** | Verify guard predicates and state-specific invariant rules. | Standard / Deep |
| **Pass 4** | **Sequence Simulation** | Replay valid and adversarial event sequences using `createFsmInstance`. | All Modes |
| **Pass 5** | **Model Check Report** | Emit state verification report and flag undefined transition hazards. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_state_machine.test.js
```
