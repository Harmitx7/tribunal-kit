---
description: Coordinate multiple agents for complex tasks. Use for multi-perspective analysis, comprehensive reviews requiring different domain expertise, or tasks where a single agent would miss domain-specific failures. Fan-Out dispatch → parallel execution → Fan-In synthesis → Human Gate.
---

# /orchestrate — Multi-Agent Coordination

$ARGUMENTS

---

## When to Use /orchestrate

|Use `/orchestrate` when...|Use something else when...|
|:---|:---|
|Task spans 2+ technical domains|Single domain → use specialist directly|
|Multi-perspective review is needed|Simple code generation → `/generate`|
|Fan-out parallelism would save time|Debugging → `/debug` (sequential by nature)|
|One agent would miss domain failures|Planning only → `/plan`|

---

## Phase 1 — Scope Classification

Before dispatching workers:

```
1. Is this actually multi-domain? (2+ distinct technical areas)
   → YES → proceed to Phase 2
   → NO  → route to the single correct specialist agent

2. Can tasks be parallelized (no dependencies between them)?
   → YES → Fan-Out dispatch (all workers simultaneous)
   → NO  → Sequential wave dispatch
   
3. Context budget check:
   □ How many files does each worker need?
   □ Total context across all workers manageable?
   □ Can I pass context_summary instead of full file dumps?
```

---

## Phase 2 — Worker Decomposition

Break the goal into atomic, non-overlapping worker tasks:

```
Goal: Review the full checkout feature before launch

Decomposed Workers:
├── Worker A [backend-specialist]: Review API routes for auth and validation
├── Worker B [database-architect]: Review DB queries for N+1 and transactions
├── Worker C [frontend-specialist]: Review UI components for RSC compliance
└── Worker D [security-auditor]: Review the full checkout flow for OWASP issues
```

**Worker files cannot overlap.** If two workers both need to modify the same file → one worker owns it.

---

## Fan-Out Pattern (Parallel Dispatch)

When tasks are independent, dispatch all simultaneously:

```
━━━ Wave 1: Fan-Out ━━━━━━━━━━━━━━━━━━━━━━━
Worker A (backend)    → RUNNING  (reading: src/app/api/checkout/)
Worker B (database)   → RUNNING  (reading: prisma/schema.prisma, checkout queries)
Worker C (frontend)   → RUNNING  (reading: src/app/checkout/page.tsx)
Worker D (security)   → RUNNING  (reading: all of the above)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wait for ALL workers (allSettled — single worker failure doesn't cancel siblings)

━━━ Wave 1: Results ━━━━━━━━━━━━━━━━━━━━━━━
Worker A: ✅ COMPLETE
Worker B: ✅ COMPLETE
Worker C: ⚠️ BLOCKED (missing: what state management pattern to assume)
Worker D: ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supervisor provides missing info to Worker C → redispatch
```

---

## BLOCKED Worker Protocol

When a worker cannot proceed:

```
Status: BLOCKED
Reason: Missing context — the auth middleware file is not in provided scope
Unblocked by: Read src/middleware.ts first and pass auth pattern to worker

Supervisor action:
1. Provide the missing context if available
2. Escalate to human if decision is needed
3. Never guess — BLOCKED beats hallucinating
```

---

## Sequential Wave Execution

When tasks depend on each other:

```
Wave 1 → Foundation (must complete first)
Wave 2 → Depends on Wave 1 output (receives context_summary, not full output)
Wave 3 → Synthesis (combines all wave outputs)
```

**Context discipline between waves:** Summarize Wave N output in 3-5 bullets before passing to Wave N+1.

---

## Fan-In — Synthesis

After all workers complete:

```
1. Merge findings by severity
2. Identify conflicts (Worker A says X, Worker B says Y)
3. Resolve conflicts with evidence (which worker has specific file evidence?)
4. Produce unified output sorted by priority
```

---

## Human Gate

```
━━━ Orchestration Complete ━━━━━━━━━━━━━━━━━

Workers: 4 dispatched / 4 complete / 0 blocked

━━━ Synthesized Findings ━━━━━━━━━━━━━━━━━━
[Critical issues first, then high, then medium]

━━━ Required Changes ━━━━━━━━━━━━━━━━━━━━━
Files to modify: [list]
Files to create: [list]

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Approve?  Y = proceed | N = discard | R = revise
```

---

## Error Recovery

```
Worker failure (after 3 retries):
  Report: agent=[name], task=[what], attempts=3, last_error=[error], suggestion=[what to check]
  Action: continue remaining workers, include failure in final synthesis
```

---

## Usage Examples

```
/orchestrate review the entire authentication system for security and correctness
/orchestrate analyze the payment feature: backend logic + DB queries + frontend UX
/orchestrate comprehensive code review before launch: security + tests + performance
/orchestrate compare three different caching strategies and recommend the best fit
```
