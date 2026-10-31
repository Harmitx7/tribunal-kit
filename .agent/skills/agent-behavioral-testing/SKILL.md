---
name: agent-behavioral-testing
description: "Use when executing behavioral verification on agents, skills, and tools against declared contracts, positive properties, negative traps, forbidden side-effects, and bounded timeouts."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - src/evaluation/agent_behavioral_testing_engine.js
  - src/evaluation/evaluation_schemas.js
inputs:
  agent_or_skill: "string"
  scenario_suite: "string"
outputs:
  behavioral_report: "object"
  all_invariants_held: "boolean"
trigger:
  - "agent behavioral test"
  - "skill contract testing"
  - "agent red-teaming"
  - "behavioral verification"
  - "side-effect audit"
  - "agent behavioral testing"
---

# Agent Behavioral Testing

## Mandatory Pre-Flight Context Inspection
Before running behavioral tests against an agent or skill, inspect these 5 critical parameters:
1. **Contract Invariant Definition**: Define unambiguous positive behavioral properties that MUST appear in the output, and forbidden behaviors that MUST NOT appear.
2. **Sandbox Isolation**: Execute the target agent inside isolated ephemeral worktree environments or mock processes to prevent unintentional host modifications.
3. **Execution Ceiling**: Enforce hard execution timeouts (default 10,000ms) with clean promise races to prevent runaway infinite loops or hanging processes.
4. **Failure Separation**: Differentiate execution crashes (`CRASHED`), timeout exhaustion (`TIMED_OUT`), and contract violations (`FAIL`).
5. **Explicit Verdicts**: Assign one of 5 definitive statuses: `PASS`, `FAIL`, `INCONCLUSIVE`, `BLOCKED`, or `NOT_RUN`. Never allow syntactically valid unexecuted tests to pass.

## Activation Boundaries
- **Activate when:** Verifying whether an agent follows instruction boundaries, testing tool call generation against schema contracts, red-teaming agents against forbidden side effects, or verifying prompt guardrails.
- **DO NOT activate when:** Running purely static codebase inspections without agent invocation or behavioral stimulation.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Contract Setup** | Load evaluation scenarios conforming to `EvaluationCaseSchema`; verify required & forbidden properties. | Fast / Standard / Deep |
| **Pass 2** | **Isolation Prep** | Initialize isolated sandbox and set up timeout supervisor ceiling. | All Modes |
| **Pass 3** | **Stimulation** | Invoke the agent handler with target input fixtures and observe full execution trace. | All Modes |
| **Pass 4** | **Invariant Check** | Check emitted output against required property regexes and forbidden behavior patterns. | All Modes |
| **Pass 5** | **Verdict & Evidence** | Generate validated `EvaluationResult` record with verified deterministic check evidence. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/agent_behavioral_testing.test.js
```
