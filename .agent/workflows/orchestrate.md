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

### Phase B — Implementation (Parallel)

After approval, specialists activate:

```
Foundation tier:  database-architect + security-auditor (run first)
Core tier:        backend-specialist + frontend-specialist (after foundation)
Quality tier:     test-engineer + qa-automation-engineer (after core)
```

Each tier's output goes through its Tribunal gate before the next tier begins.

---

## Cross-Agent Context Handoff

When one agent's output feeds the next:

```
The context passed to Agent B must include:
  "Agent A produced: [result]
   Build on this. Do not re-derive it."
```

Never let Agent B re-invent what Agent A already established.

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
