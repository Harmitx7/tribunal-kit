---
name: plan-writing
description: Technical design and implementation planning mastery. Writing structured execution checklists, dependency mapping, establishing rollback protocols, segmenting monolithic tasks, writing ADRs (Architecture Decision Records), and defining verification criteria. Use when transitioning from ideation to coordinated execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Writing plans without verification criteria -> ✅ Every plan needs a 'How to verify this worked' section
- ❌ Planning at the wrong granularity (too high or too low) -> ✅ Plans should be at the component/feature level, not line-by-line or system-wide
- ❌ Skipping the 'What could go wrong' section -> ✅ Identifying failure modes before implementation prevents costly rework

---


# Plan Writing — Execution Blueprints Mastery

---

## 1. The Implementation Plan Structure (ADR-Lite)

Before altering multiple files or introducing a new system architecture, a rigid `implementation_plan.md` MUST be generated and approved. 

**Core Sections:**
1. **Objective Context:** 2-sentence summary of the requested goal.
2. **Architectural Handoff:** (What stack, what libraries, what constraints).
3. **Dependency Tree Execution Order:** (Cannot build frontend UI until backend API exists).
4. **File Blueprint:** Exact files expected to be touched (`[NEW] src/api/user.ts`, `[MODIFY] src/db/schema.prisma`).
5. **Verification Protocol:** Exactly how the agent/human will prove the task is completed successfully.

---

## 2. Segmenting Monolithic Tasks (Chunking)

LLMs degrade significantly when asked to process >10 file alterations across multiple directories simultaneously. The Plan Writer must break work into logical, isolated "Waves."

```markdown
### Wave 1: Data Layer (The Foundation)
1. Add `Subscription` model to Prisma schema.
2. Generate migration (`npx prisma migrate dev`).
3. Add mock seed data.

### Wave 2: API Layer (The Bridge)
1. Build `/api/subscriptions/route.ts` with explicit Zod validation.
2. Write Vitest logic enforcing authorization roles.

### Wave 3: UI Layer (The Implementation)
1. Build `SubscriptionCard.tsx`.
2. Connect to API using MSW mocked tests first.
3. Integrate into main dashboard.
```

*Crucial:* Each wave MUST be executable and testable independently. Do not begin Wave 2 until Wave 1 passes Verification Protocols.

---

## 3. Rollback & Contingency Planning

No plan survives first contact with the compiler. The plan must implicitly include safe-fail procedures.

- **Non-Destructive Defaults:** If a schema migration fails, how do we revert? (e.g., explicit instruction to backup SQLite DB locally before operations).
- **Graceful Feature Toggles:** Is the new feature walled behind an environment variable (`ENABLE_NEW_DASHBOARD=true`) so it can be disabled instantly if it crashes in production?

---

## 4. The `task.md` Execution Ledger

Unlike the high-level `implementation_plan.md`, the `task.md` serves as the live, mutating execution state.

```markdown
# Current Objective: Upgrade Authentication

## Pre-Flight
- [x] Dump existing environment variables locally
- [x] Verify current tests pass (Baseline health)

## Wave 1 (OAuth Scaffold)
- [/] Install auth.js dependencies
- [ ] Connect Google Provider inside `[...nextauth].ts`

## Wave 2 (Database Mappings)
- [ ] Update Users table to handle polymorphic OAuth links
```

*Rules:*
- `[ ]` = Unstarted
- `[/]` = In Progress (Current Focus)
- `[x]` = Verified Complete

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



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
