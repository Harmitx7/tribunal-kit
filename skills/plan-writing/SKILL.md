---
name: plan-writing
description: Use when Technical design and implementation planning mastery. Writing structured execution checklists, dependency mapping, establishing rollback protocols, segmenting monolithic tasks, writing ADRs (Architecture Decision Records), and defining verification criteria. Use when transitioning from ideation to coordinated execution.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - project-planner
  - brainstorming
  - harness-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Plan Writing — Execution Blueprints Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `plan-writing` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Technical design and implementation planning mastery. Writing structured execution checklists, dependency mapping, establishing rollback protocols, segmenting monolithic tasks, writing ADRs (Architecture Decision Records), and defining verification criteria. Use when transitioning from ideation to coordinated execution.
- **DO NOT activate when:** The task falls outside the `plan-writing` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## 2026 Plan Writing & Task Contract Invariants

1. **The Strict Task Contract**:
   Every plan must establish:
   - **OBJECTIVE**: Precise outcome expected.
   - **HARD CONSTRAINTS**: Unchangeable tech stack, performance budgets, backwards compatibility.
   - **ACCEPTANCE CRITERIA**: Unambiguous, observable conditions proving success (e.g. `npm test exits 0`, `LCP < 1.2s`).
2. **Chunking Limit (Max 5 Files Per Wave)**:
   Never generate a single wave touching > 5 files. Break large epics into consecutive waves where each wave compiles and passes verification before proceeding.
3. **Evidence-Based Closeout**:
   Every wave ends with an automated command the agent or human must run to prove correctness before proceeding to the next wave.

## Hallucination Traps (Read First)

- ❌ Writing plans without verification criteria → ✅ Every plan needs a 'How to verify this worked' section
- ❌ Planning at the wrong granularity (too high or too low) → ✅ Plans should be at the component/feature level
- ❌ Skipping the 'What could go wrong' section → ✅ Identifying failure modes before implementation prevents costly rework
- ❌ Multi-file mega plans without wave chunking → ✅ Break into independent, testable waves

---

## 1. The Implementation Plan Structure (ADR-Lite)

Before altering multiple files or introducing a new system architecture, a rigid `implementation_plan.md` MUST be generated and approved.

**Core Sections:**

1. **Objective Context:** 2-sentence summary of the requested goal.
2. **Architectural Handoff:** (What stack, what libraries, what constraints).
3. **Task-Level Interface Contracts (Mandatory for Subagent Decoupling):**
   Every task MUST declare:
   - `Consumes:` Exact function signatures and types it imports from prior tasks.
   - `Produces:` Exact function signatures and types it exports for subsequent tasks.
4. **The Zero-Placeholder Invariant:**
   Never write "TBD", "TODO", "implement later", "add validation", or "write tests for above". Every step must contain complete, exact code blocks and verification commands.
5. **Dependency Tree Execution Order:** (Cannot build frontend UI until backend API exists).
6. **File Blueprint:** Exact files expected to be touched (`[NEW] src/api/user.ts`, `[MODIFY] src/db/schema.prisma`).
7. **Verification Protocol:** Exactly how the agent/human will prove the task is completed successfully.

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

_Crucial:_ Each wave MUST be executable and testable independently. Do not begin Wave 2 until Wave 1 passes Verification Protocols.

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

_Rules:_

- `[ ]` = Unstarted
- `[/]` = In Progress (Current Focus)
- `[x]` = Verified Complete

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
