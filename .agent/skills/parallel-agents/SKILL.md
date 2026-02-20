---
name: parallel-agents
description: Multi-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Multi-Agent Orchestration

> Parallel agents are faster. They are also harder to keep consistent.
> Coordinate them — don't just fire them simultaneously and hope for compatible outputs.

---

## When to Use Parallel Agents

Use multiple agents when:
- Tasks are genuinely **independent** (output of A doesn't feed input of B)
- Different tasks require **different domain expertise**
- Comprehensive **review** needs multiple specialist perspectives simultaneously
- Speed matters and tasks can be assigned and awaited independently

Do **not** use parallel agents when:
- Tasks have sequential dependencies (you need the result to start the next)
- The overhead of coordination exceeds the time saved

---

## Orchestration Patterns

### Pattern 1 — Parallel Review (Tribunal)

Multiple reviewers look at the same code simultaneously, each from a different angle.

```
Code (input)
    ├── → logic-reviewer      → finds logic errors
    ├── → security-auditor    → finds vulnerabilities  
    ├── → type-safety-reviewer → finds type unsafe code
    └── → performance-reviewer → finds bottlenecks

All verdicts → synthesize → Human Gate (approve/reject/revise)
```

**When:** `/tribunal-*` commands, code review before merge

### Pattern 2 — Domain Specialization

Different specialists handle different parts of the same task simultaneously.

```
"Build a user auth system" (input)
    ├── → backend-specialist    → API routes + JWT logic
    ├── → frontend-specialist   → Login/register UI
    └── → database-architect    → User schema + sessions table

All outputs → orchestrator synthesizes into coherent system
(ensures API contract matches what frontend calls,
 and DB schema matches what backend queries)
```

**When:** Full-stack feature builds via `/orchestrate`

### Pattern 3 — Sequential with Parallel Phases

Some tasks are inherently sequential at the macro level but can parallelize within each phase.

```
Phase 1 (sequential):
  database-architect → schema design

Phase 2 (parallel, after Phase 1):
  backend-specialist  → API uses schema from Phase 1
  frontend-specialist → UI uses API contract from Phase 2a (estimated)

Phase 3 (sequential, after Phase 2):
  test-engineer → E2E tests with real API + UI
```

---

## Orchestrator Responsibilities

The orchestrator coordinates agents. It:

1. **Assigns scope** — each agent gets exactly what it needs, nothing more
2. **Manages state** — passes the right outputs from each agent to the next that needs them
3. **Resolves conflicts** — when two agents propose incompatible solutions, the orchestrator decides or asks the user
4. **Verifies consistency** — ensures that the API contract the backend builds matches what the frontend calls

---

## Consistency Rules for Multi-Agent Output

The biggest failure in parallel agent work is **inconsistency at boundaries**:

- Backend generates `userId` but frontend calls it `user_id`
- Database schema has `user_email` but backend queries `email`
- Agent A designs one error shape; Agent B assumes a different one

**Prevention:**
- Establish contracts (types, schemas, API shapes) **before** parallel work begins
- Each agent receives the shared contract as context
- Orchestrator reviews all outputs for boundary consistency before presenting to user

---

## Communication Format Between Agents

When one agent's output feeds another:

```
[AGENT: backend-specialist OUTPUT]
API Contract:
  POST /api/users → { id: string, email: string, createdAt: string }
  POST /api/auth/login → { token: string, expiresAt: string }

[AGENT: frontend-specialist RECEIVES]
Use the above API contract. Build the UI to match these exact request/response shapes.
```
