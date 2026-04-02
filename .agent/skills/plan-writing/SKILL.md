---
name: plan-writing
description: Technical design and implementation planning mastery. Writing structured execution checklists, dependency mapping, establishing rollback protocols, segmenting monolithic tasks, writing ADRs (Architecture Decision Records), and defining verification criteria. Use when transitioning from ideation to coordinated execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Plan Writing — Execution Blueprints Mastery

> A flawless execution of a terrible plan leads to catastrophic success.
> Write planes with dependencies explicitly mapped. Treat it like a topological sort.

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

## 🤖 LLM-Specific Traps (Plan Writing)

1. **Topological Chaos:** Recommending the creation of a frontend React component fetching an API endpoint that has not yet been scheduled for creation, resulting in immediate compilation/linting crashes.
2. **Missing File Paths:** Writing "Update the configuration file" instead of explicitly declaring `[MODIFY] .github/workflows/deploy.yml`. Vague boundaries invite shotgun surgery.
3. **Execution Masking:** The AI receives the instruction to "Write a plan," but decides to also write 450 lines of execution code spanning 6 files simultaneously in the same reply. Demarcate Planning from Execution permanently.
4. **Over-Engineering the MVP:** Recommending a 4-wave, 12-step Kubernetes microservice deployment schedule for a localized "Add a 'Contact Us' form" user request.
5. **No Verification Baseline:** Failing to establish a "Does the code currently work?" baseline constraint before beginning the sequence of alterations.
6. **Task Blobbing:** Creating a massive, single 25-step list without breaking it up into isolated, independently testable Waves/Phases. If the list is monolithic, the failure debugging will be chaotic.
7. **Silent Dependencies:** Failing to explicitly list new NPM packages or system libraries required by the plan (e.g., executing Prisma logic without adding a `npm install @prisma/client` step).
8. **Assumption of Success:** Failing to establish Rollback protocols (e.g., `git reset --hard`) when planning risky, highly destructive file alterations.
9. **Ignoring the Environment:** Planning major API changes without ensuring the required environment variables (`STRIPE_API_KEY`) are documented for addition.
10. **Refusal to Update Ledger:** Operating as an autonomous executor but failing to edit the `task.md` tracking ledger synchronously, destroying the system's memory continuity upon suspension.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are execution sequences strictly ordered by Topological Dependencies (DB → API → UI)?
✅ Are monolith tasks deliberately chunked into isolated, independently testable Waves?
✅ Is the `task.md` execution ledger cleanly parameterized with exact file paths `[NEW], [MODIFY]`?
✅ Have I explicitly separated the Planning Phase response from raw Code Generation?
✅ Are verification protocols explicitly tied to terminal logs, test results, or manual checks?
✅ Are required NPM package installations/dependency injections explicitly mapped in Wave 1?
✅ Is there a defined Rollback/Snapshot strategy to recover from catastrophic compilation failure?
✅ Are environmental secrets (.env variables) outlined as requirements before execution?
✅ Has the complexity of the plan been correctly scaled to the simplicity of the user's objective?
✅ Does the plan establish a baseline system health check before executing destructive mutations?
```
