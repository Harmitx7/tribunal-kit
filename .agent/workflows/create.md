---
description: Create new application command. Triggers App Builder skill and starts interactive dialogue with user.
---

# /create — Build Something New

$ARGUMENTS

---

This command starts a structured creation process. Code only appears after requirements are clear and a plan is approved.

---

## The Four Stages

### Stage 1 — Understand (not optional)

Before any planning begins, these four things must be established:

```
1. What is the user's actual goal?     (not the feature — the outcome)
2. What stack are we working in?       (existing project or greenfield?)
3. What is explicitly out of scope?    (boundary prevents scope creep)
4. What's the observable done state?   (how do we know it's finished?)
```

If anything is unclear → ask. Do not skip to Stage 2 on assumptions.

### Stage 2 — Plan

Engage `project-planner` to write a structured plan:

```
Location: docs/PLAN-{task-slug}.md

Must contain:
  - Goal (one sentence)
  - OOS list (what we won't build)
  - Task table with: task / agent / dependency / done-condition
  - Tribunal gate per task
```

**The plan is shown to the user before any code is written.**

> ⏸️ "Here's the plan: `docs/PLAN-{slug}.md` — proceed?"
> Do not advance until explicitly confirmed.

### Stage 3 — Build (Parallel agents, after approval)

| Layer | Agent | Review Gate |
|---|---|---|
| Data schema | `database-architect` | `/tribunal-database` |
| API & server | `backend-specialist` | `/tribunal-backend` |
| UI & components | `frontend-specialist` | `/tribunal-frontend` |
| Test coverage | `test-engineer` | `logic + test-coverage` |

Each agent's code goes through Tribunal before being shown to the user.

### Stage 4 — Verify

```
Did the code satisfy every done-condition from Stage 1?   Y / N
Did all Tribunal reviewers return APPROVED?               Y / N
Are untested paths labeled // TODO with an explanation?  Y / N
```

All three must be Y before the task is declared done.

---

## Hallucination Rules

- Every import must exist in the project's `package.json` or carry `// VERIFY: add to deps`
- No invented framework methods — `// VERIFY: check docs for this method` on any uncertain call
- No agent touches code outside its domain

---

## Usage

```
/create a REST API with JWT auth
/create a React dashboard with real-time chart updates
/create a complete user onboarding flow (frontend + backend + DB)
```
