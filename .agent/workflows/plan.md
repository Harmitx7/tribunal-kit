---
description: Create project plan using project-planner agent. No code writing — only plan file generation.
---

# /plan — Write the Plan First

$ARGUMENTS

---

This command produces one thing: **a structured plan file**. Nothing is implemented. No code is written. The plan is the output.

---

## When to Use /plan vs Other Commands

| Use `/plan` when... | Use something else when... |
|---|---|
| Requirements are unclear or large | You already know what to build → `/create` |
| Multi-agent work needs coordination | Single function needed → `/generate` |
| You want written scope agreement before coding | Ready to build immediately → `/create` |
| Stakeholder review is needed before work starts | Just a quick discussion → ask directly |

---

## Why Plan Before Building

> Tasks without plans get rebuilt three times.
> Plans expose ambiguity before it becomes broken code.

---

## How It Works

### Gate: Clarify Before You Plan

The `project-planner` agent asks — and gets answers to — these four questions before writing a single line of the plan:

```
1. What outcome needs to exist that doesn't exist today?
2. What are the hard constraints? (stack, existing code, deadline)
3. What's explicitly not being built in this version?
4. How will we confirm it's done? (observable done condition)
```

If any answer is "I don't know" — those are clarified **before** the plan is written, not after.

> ⚠️ An unclear "done condition" is the most common cause of scope creep. It must be specific and observable.

---

### Plan File Creation

```
Location: docs/PLAN-{task-slug}.md

Slug naming rules:
  - Pull 2–3 key words from the request
  - Lowercase + hyphens
  - Max 30 characters
  Examples:
    "build auth with JWT"       → PLAN-auth-jwt.md
    "shopping cart checkout"    → PLAN-cart-checkout.md
    "multi-tenant user roles"   → PLAN-user-roles.md
```

---

## Plan File Structure

```markdown
# Plan: [Feature Name]

## What Done Looks Like
[Observable outcome — one specific, testable sentence]

## Won't Include in This Version
- [Explicit exclusion 1]
- [Explicit exclusion 2]

## Unresolved Questions
- [Item needing external confirmation: VERIFY]

## Estimates (Ranges + Confidence)
| Task | Optimistic | Realistic | Pessimistic | Confidence |
|------|-----------|-----------|-------------|------------|
| DB schema | 30min | 1h | 2h | High |
| API layer | 2h | 4h | 8h | Medium |
| Frontend | 3h | 6h | 12h | Low |

## Task Table
| # | Task | Agent | Depends on | Done when |
|---|------|-------|-----------|-----------| 
| 1 | DB schema | database-architect | none | migration runs |
| 2 | API routes | backend-specialist | #1 | returns 201 |
| 3 | Frontend component | frontend-specialist | #2 | renders without errors |
| 4 | Tests | test-engineer | #2 | all specs pass |

## Review Gates
| Task | Tribunal |
|---|---|
| #1 schema | /tribunal-database |
| #2 API | /tribunal-backend |
| #3 UI | /tribunal-frontend |
| #4 tests | test-coverage-reviewer |
```

---

### After the File is Written

```
✅ Plan written: docs/PLAN-{slug}.md

Review it, then:
  /create    → Begin full implementation (uses this plan)
  /generate  → Implement a single task from the table
  /orchestrate → Coordinate all agents across the full plan
```

---

## Hallucination Guard

- Every tool, library, or API mentioned in the plan must be **real and verified** before being listed
- Time estimates are **ranges with confidence labels** — never single-point guarantees
- External dependencies that aren't confirmed get a `[VERIFY: check this exists]` tag
- The done condition is **observable and specific** — "it works" is not a done condition

---

## Cross-Workflow Navigation

| After /plan produces the file... | Go to |
|---|---|
| Ready to build the full plan | `/create` reads the plan and starts building |
| Need a single task implemented | `/generate [task description]` |
| Multi-agent coordination needed | `/orchestrate` to run the plan as a managed build |
| Need to review existing code first | `explorer-agent` before committing to the plan |

---

## Usage

```
/plan REST API with user auth
/plan dark mode toggle for the settings page
/plan multi-tenant account switching
/plan event-driven notification system with queues
/plan admin dashboard with user management and analytics
```
