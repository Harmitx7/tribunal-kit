---
description: Create new application command. Triggers App Builder skill and starts interactive dialogue with user.
---

# /create — Build Something New

$ARGUMENTS

---

This command starts a structured creation process. **Code only appears after requirements are clear and a plan is approved.** Building before understanding is the number one source of wasted work.

---

## When to Use /create vs Other Commands

| Use `/create` when... | Use something else when... |
|---|---|
| Starting something from scratch | Extending existing code → `/enhance` |
| Building a complete feature (frontend + backend + DB) | Single function needed → `/generate` |
| You need a plan before code | Plan only, no code → `/plan` |
| Multi-domain coordination required | Single domain → `/generate` with right tribunal |

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

**If anything is unclear → ask. Do not skip to Stage 2 on assumptions.**

Minimum Socratic gate questions by project type:

| Project type | Questions to ask before planning |
|---|---|
| API / backend | Auth strategy? Database? Error format? Rate limiting? |
| Frontend / UI | Framework? Design system? State management? SSR? |
| Full-stack | All of the above + deployment target |
| CLI tool | Target OS? Binary or script? Package manager integration? |

---

### Stage 2 — Plan

Engage `project-planner` to write a structured plan:

```
Location: docs/PLAN-{task-slug}.md

Must contain:
  - Goal (one sentence)
  - Out-of-scope list (what we won't build in this version)
  - Open questions with [VERIFY] tags
  - Task table: task / agent / dependency / done-condition
  - Tribunal gate per task
  - Time estimates: optimistic / realistic / pessimistic + confidence level
```

**The plan is shown to the user before any code is written.**

> ⏸️ "Here's the plan: `docs/PLAN-{slug}.md` — proceed?"
> Do not advance until explicitly confirmed with **Y**.

---

### Stage 3 — Build (Parallel agents, after approval)

| Layer | Primary Agent | Review Gate |
|---|---|---|
| Data schema / migrations | `database-architect` | `/tribunal-database` |
| API & server logic | `backend-specialist` | `/tribunal-backend` |
| UI & components | `frontend-specialist` | `/tribunal-frontend` |
| Test coverage | `test-engineer` | `logic + test-coverage-reviewer` |
| DevOps / deploy config | `devops-engineer` | `/tribunal-backend` |

Each agent's code goes through Tribunal before being shown to the user.

**Wave execution (if multiple layers):**

```
Wave 1: database-architect → reviewed → Human Gate
Wave 2: backend-specialist (uses Wave 1 schema) → reviewed → Human Gate
Wave 3: frontend-specialist + test-engineer (parallel) → reviewed → Human Gate
```

---

### Stage 4 — Verify

```
□ Did the code satisfy every done-condition from Stage 1?
□ Did all Tribunal reviewers return APPROVED?
□ Are untested paths labeled // TODO with an explanation?
□ Does the plan file match what was actually built?
```

All four must be checked before the task is declared done.

---

## Hallucination Rules

- Every import must exist in the project's `package.json` or carry `// VERIFY: add to deps`
- No invented framework methods — `// VERIFY: check docs for this method` on any uncertain call
- No agent touches code outside its domain (frontend agent never writes DB migrations)
- No full-application generation in one shot — build in layers with Human Gates between waves

---

## Cross-Workflow Navigation

| If during /create you need to... | Go to |
|---|---|
| Understand the existing codebase first | Use `explorer-agent` before Stage 2 |
| Only write the plan (not build it) | `/plan` |
| Add to an already built feature | `/enhance` |
| Debug something during Stage 3 | `/debug` |
| Run a full safety check before shipping | `/audit` |

---

## Usage

```
/create a REST API with JWT auth
/create a React dashboard with real-time chart updates
/create a complete user onboarding flow (frontend + backend + DB)
/create a CLI tool that validates JSON schemas against a spec
/create a scheduled background job for sending email digests
```
