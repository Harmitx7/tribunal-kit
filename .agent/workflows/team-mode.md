---
name: team-mode
description: "Enable dynamic multi-agent task execution, DAG routing, and parallel reviews."
version: 1.1.0
required-skills:
  - team-mode
  - agent-organizer
  - parallel-agents
  - swarm
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
---

# /team-mode — Dynamic Multi-Agent DAG Orchestration

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before dispatching multi-agent team mode:
1. Validate subagent payload contracts with `swarm_dispatcher.js`.
2. Inspect task boundaries to guarantee worker files do not overlap.
3. Enforce context window budgets: pass scoped `context_summary` per worker.

---

## Phase 1 — Scope Decomposition & DAG Scheduling

1. Decompose the incoming goal into atomic, non-overlapping worker subtasks.
2. Structure dependencies into a Directed Acyclic Graph (DAG) using `dag_scheduler`.
3. Check for circular dependencies; reject invalid cycles before dispatch.

---

## Phase 2 — Parallel Wave Dispatch & Execution

1. Dispatch independent wave nodes simultaneously via `Promise.allSettled()`.
2. Assign specialized agents based on domain mandates:
   - Backend/API → `backend-specialist`
   - Database/Schema → `database-architect`
   - UI/Components → `frontend-specialist`
   - Security/Auth → `security-auditor`
3. Intercept worker status transitions: `DISCOVERED → SELECTED → INVOKED → EXECUTED → OUTPUT VALIDATED → VERIFIED`.

---

## Phase 3 — Result Transfer & Synthesis

1. Validate intermediate outputs against domain schemas before handoff.
2. Pass verified artifacts from upstream stages to downstream dependent workers.
3. Merge findings by severity; resolve conflicts with concrete file evidence.

---

## Error Recovery & BLOCKED Protocol

- **Worker Failure**: Single worker failure does not abort sibling nodes (`allSettled` pattern).
- **Context Missing**: If worker reports `BLOCKED`, supervisor supplies missing context or escalates to human.
- **Human Gate**: Destructive actions (deletions, schema drops) trigger immediate pause and summon `human-gate-negotiator`.

---

## Final Verification & Exit Criteria

- [ ] All DAG tasks completed or cleanly failed with diagnostics.
- [ ] Multi-perspective review verified with authoritative evidence.
- [ ] No unhandled worker crashes or unvalidated handoffs.
