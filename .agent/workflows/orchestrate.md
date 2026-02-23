---
description: Coordinate multiple agents for complex tasks. Use for multi-perspective analysis, comprehensive reviews, or tasks requiring different domain expertise.
---

# /orchestrate — Multi-Agent Coordination

$ARGUMENTS

---

This command coordinates multiple specialists to solve a problem that requires more than one domain. One agent is not orchestration.

---

## The Minimum Rule

> **Fewer than 3 agents = not orchestration.**
>
> Before marking any orchestration session as complete, count the agents invoked. If the count is less than 3, activate more. A single agent delegated to is just a delegation.

---

## Agent Selection by Task Type

| Task | Required Specialists |
|---|---|
| Full-stack feature | `frontend-specialist` + `backend-specialist` + `test-engineer` |
| API build | `backend-specialist` + `security-auditor` + `test-engineer` |
| Database-heavy work | `database-architect` + `backend-specialist` + `security-auditor` |
| Complete product | `project-planner` + `frontend-specialist` + `backend-specialist` + `devops-engineer` |
| Security investigation | `security-auditor` + `penetration-tester` + `devops-engineer` |
| Complex bug | `debugger` + `explorer-agent` + `test-engineer` |

---

## Two-Phase Protocol (Strict)

### Phase A — Planning Only

Only two agents are allowed during planning:

```
project-planner   → writes docs/PLAN-{slug}.md
explorer-agent    → (if working in existing code) maps the codebase
```

No other agent runs. No code is produced.

After planning, the plan is shown to the user:

```
✅ Plan ready: docs/PLAN-{slug}.md

Approve to start implementation? (Y / N)
```

**Phase B does NOT start without a Y.**

### Phase B — Implementation (Manager & Micro-Workers)

After approval, the Orchestrator acts as Manager and dispatches Micro-Workers using isolated JSON payloads.

```
Wave 1:  database-architect + security-auditor (JSON dispatch #1)
[Wait for completion & Tribunal]

Wave 2:  backend-specialist + frontend-specialist (JSON dispatch #2)
[Wait for completion & Tribunal]
```

Workers execute in parallel within their wave, receiving ONLY their specific file context to minimize tokens and hallucination risk.

---

## Hierarchical Context Pruning

When dispatching workers, the Orchestrator MUST use the `dispatch_micro_workers` JSON format.
The context rule is strict:
- **No full chat histories** are passed to workers.
- The `context_summary` injected by the Orchestrator is the ONLY context the worker sees regarding the larger goal.
- Files attached must be strictly limited to the absolute minimum needed to complete the task.

---

## Hallucination Guard

- Every agent's output goes through Tribunal before it reaches the user
- The Human Gate fires before any file is written — the user sees the diff and approves
- Retry limit: 3 Maker revisions per agent. After 3 failures, stop and report to the user.
- Per-agent scope is enforced — `frontend-specialist` never writes DB migrations

---

## Usage

```
/orchestrate build a complete auth system with JWT and refresh tokens
/orchestrate review the entire API layer for security issues
/orchestrate build a multi-tenant SaaS onboarding flow
```
