---
description: Coordinate multiple agents for complex tasks. Use for multi-perspective analysis, comprehensive reviews, or tasks requiring different domain expertise.
---

# /orchestrate — Multi-Agent Coordination

$ARGUMENTS

---

This command coordinates multiple specialists to solve a problem that requires more than one domain. **One agent is not orchestration.**

---

## When to Use /orchestrate vs Other Commands

| Use `/orchestrate` when... | Use something else when... |
|---|---|
| Task requires 3+ domain specialists | Single domain → use the right `/tribunal-*` |
| Sequential work with review gates between waves | Parallel, independent tasks → `/swarm` |
| Existing codebase with complex dependencies | Greenfield project → `/create` |
| Human gates required between every wave | Maximum parallel output → `/swarm` |

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
| New codebase or unknown repo | `explorer-agent` + relevant specialists |

---

## Two-Phase Protocol (Strict)

### Phase A — Planning Only

Only two agents are allowed during planning:

```
project-planner   → writes docs/PLAN-{slug}.md
explorer-agent    → (if working in existing code) maps the codebase structure
```

No other agent runs. No code is produced.

After planning, the plan is shown to the user:

```
✅ Plan ready: docs/PLAN-{slug}.md

Approve to start implementation? (Y / N)
```

**Phase B does NOT start without a Y.**

### Phase B — Implementation (Manager & Micro-Workers)

After approval, the Orchestrator acts as Manager and dispatches Micro-Workers using **isolated JSON payloads**.

```
Wave 1:  database-architect + security-auditor (JSON dispatch #1)
         ↓
[Wait for completion & Tribunal review]
         ↓
Wave 2:  backend-specialist + frontend-specialist (JSON dispatch #2)
         ↓
[Wait for completion & Tribunal review]
         ↓
Wave 3:  test-engineer (JSON dispatch #3)
         ↓
[Wait for completion & Human Gate]
```

Workers execute in parallel **within** their wave, but waves execute **sequentially**. Each wave waits for the previous wave's Tribunal gate before proceeding.

---

## Hierarchical Context Pruning

When dispatching workers, the Orchestrator MUST use the `dispatch_micro_workers` JSON format.

**Context discipline is strictly enforced:**

```
❌ Never pass full chat histories to workers
❌ Never attach every file — attach only files the worker will actually read
✅ The context_summary injected by the Orchestrator is the ONLY shared context
✅ Files attached are strictly limited to what's needed for that specific task
```

**Per-worker context limit:** Excerpt only the relevant function or schema section — never the entire file.

---

## Retry Protocol

```
Attempt 1  → Worker runs with original parameters
Attempt 2  → Worker runs with stricter constraints + failure feedback
Attempt 3  → Worker runs with max constraints + full context dump
Attempt 4  → HALT. Report to human with full failure history.
```

Hard limit: **3 retries per worker**. After 3 failures, escalate — do not silently proceed.

---

## Hallucination Guard

- Every agent's output goes through Tribunal before it reaches the user
- The Human Gate fires before any file is written — user sees the diff and approves
- Per-agent scope is enforced — `frontend-specialist` **never** writes DB migrations
- Retry limit: 3 Maker revisions per agent; after 3 failures → stop and report
- `context_summary` is the only mechanism for sharing context across agents — no full dumps

---

## Cross-Workflow Navigation

| When /orchestrate reveals... | Go to |
|---|---|
| Worker keeps failing after 3 retries | `/debug` the isolated worker task |
| Plan needed before orchestrating | `/plan` first, then run `/orchestrate` against it |
| Fully parallel independent sub-tasks | `/swarm` is more efficient |
| Single domain needs specialist audit | Use the domain-specific `/tribunal-*` |

---

## Usage

```
/orchestrate build a complete auth system with JWT and refresh tokens
/orchestrate review the entire API layer for security issues
/orchestrate build a multi-tenant SaaS onboarding flow
/orchestrate analyze this repo and implement all security findings
```
