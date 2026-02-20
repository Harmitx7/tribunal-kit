---
description: Create project plan using project-planner agent. No code writing - only plan file generation.
---

# /plan — Write the Plan First

$ARGUMENTS

---

This command produces one thing: a structured plan file. Nothing is implemented. No code is written. The plan is the output.

---

## Why Plan Before Building

> Tasks without plans get rebuilt three times.
> Plans expose ambiguity before it becomes broken code.

---

## How It Works

### Gate: Clarify Before You Plan

The `project-planner` agent asks:

```
What outcome needs to exist that doesn't exist today?
What are the hard constraints? (stack, existing code, deadline)
What's explicitly not being built in this version?
How will we confirm it's done?
```

If any answer is "I don't know" — those are clarified before the plan is written, not after.

### Plan File Creation

```
Location: docs/PLAN-{task-slug}.md

Slug naming:
  Pull 2–3 key words from the request
  Lowercase + hyphens
  Max 30 characters
  "build auth with JWT" → PLAN-auth-jwt.md
  "shopping cart checkout" → PLAN-cart-checkout.md
```

### After the File is Written

```
✅ Plan written: docs/PLAN-{slug}.md

Review it, then:
  Run /create to begin implementation
  Or edit the file to refine scope first
```

---

## Plan File Structure

```markdown
# Plan: [Feature Name]

## What Done Looks Like
[Observable outcome — one sentence]

## Won't Include in This Version
- [Explicit exclusion]

## Unresolved Questions
- [Thing that needs external confirmation: VERIFY]

## Estimates (Ranges + Confidence)
All time estimates include: optimistic / realistic / pessimistic + confidence level

## Task Table
| # | Task | Agent | Depends on | Done when |
|---|------|-------|-----------|-----------|
| 1 | ... | database-architect | none | migration runs |
| 2 | ... | backend-specialist | #1 | returns 201 |

## Review Gates
| Task | Tribunal |
|---|---|
| #1 schema | /tribunal-database |
| #2 API | /tribunal-backend |
```

---

## Hallucination Guard

- Every tool/library mentioned in the plan must be real and verified
- All time estimates are ranges with a confidence label — never single-point guarantees
- External dependencies that aren't confirmed get a `[VERIFY: check this exists]` tag

---

## Usage

```
/plan REST API with user auth
/plan dark mode toggle for the settings page
/plan multi-tenant account switching
```
