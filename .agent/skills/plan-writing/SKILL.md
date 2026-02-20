---
name: plan-writing
description: Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Task Planning Standards

> A plan is not a promise. It is a map.
> Maps get updated when the terrain doesn't match them.

---

## When to Write a Plan

Write a plan before implementation when:
- The task touches more than 2 files in non-trivial ways
- The task has dependencies (thing B can't start until thing A is done)
- The task involves a risky operation (migration, data transformation, breaking change)
- The team needs to review the approach before time is spent implementing it

Skip the formal plan for: single-function fixes, typo corrections, config tweaks.

---

## Plan Structure

```markdown
# Plan: [Feature or Task Name]

## Goal
One sentence: what outcome does this achieve?

## Context
- Why is this being done?
- What problem does it solve or what requirement does it satisfy?
- What exists today that this changes?

## Approach
High-level strategy. Enough detail for someone unfamiliar with the code to understand the direction.
Not implementation details — those go in the tasks.

## Tasks

### Phase 1 — [Name] (prerequisite for Phase 2)
- [ ] Task 1.1: Description
- [ ] Task 1.2: Description (depends on 1.1)

### Phase 2 — [Name] (can run after Phase 1 is complete)
- [ ] Task 2.1: Description
- [ ] Task 2.2: Description

## Verification
How will we know this is done and working?
- [ ] Specific behavior that can be tested
- [ ] Metric or log line that confirms success
- [ ] Edge case that must not regress

## Risks and Open Questions
- [Risk]: What might go wrong, and what's the mitigation?
- [Open]: What decision hasn't been made yet that could change this plan?

## Files That Will Change
- `path/to/file.ts` — what changes
- `path/to/schema.sql` — what changes
```

---

## Dependency Notation

When tasks have a strict order, mark it:

```
Task A — (no dependencies, do first)
Task B — (requires A complete)
Task C — (can run parallel with B)
Task D — (requires B and C complete)
```

This prevents teams from working on D while B is still broken.

---

## Task Granularity

Each task should be:
- Completable in one session by one person
- Independently reviewable (a PR could represent one task)
- Testable: there is a concrete way to know if it's done

**Too vague:** "Implement the auth system"
**Right size:** "Add `POST /api/auth/login` endpoint with JWT issuance and Zod validation"

---

## Updating the Plan

Plans are living documents:

- Mark tasks `[x]` when complete, not when started
- Add `[!]` to blocked tasks with a note on what is blocking
- When an assumption proves wrong, update the approach section — don't silently deviate from the plan

---

## Verification Criteria Rules

Verification criteria are not optional. For each task:

- At least one must be **observable** (you can see it, not just believe it)
- At least one must cover a **failure mode** (what should NOT happen)

```
✅ Observable: `POST /api/users` returns 201 with a user ID in the response body
✅ Failure mode: `POST /api/users` with a duplicate email returns 409, not 500
```
