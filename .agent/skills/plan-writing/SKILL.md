---
name: plan-writing
description: Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** Every plan must integrate a strict "evidence-based closeout" state machine for its tasks.
- ❌ **Forbidden:** Writing vague verification steps like "Check that it looks right," "Ensure the code makes sense," or "Verify the logic."
- ✅ **Required:** Verification criteria MUST demand **concrete terminal/compiler evidence** (e.g., test success logs, CLI execution outputs, compiler success states, or network trace results). Explicitly state that an agent CANNOT consider the task complete until it captures this hard evidence.

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Plan Writing Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
