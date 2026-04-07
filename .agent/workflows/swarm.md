---
description: Multi-Agent Swarm Orchestration. Supervisor decomposes a complex goal into sub-tasks, dispatches to specialist Workers via structured JSON contracts, collects results via allSettled fan-in, and synthesizes a unified deliverable. Validates payloads via swarm_dispatcher.py before dispatch.
---

# /swarm — Multi-Agent Swarm Execution

$ARGUMENTS

---

## When to Use /swarm Over /orchestrate

|Use `/swarm` when...|Use `/orchestrate` when...|
|:---|:---|
|5+ workers needed simultaneously|2-4 workers in a review|
|Tasks are explicitly JSON-contracted|Tasks can be described informally|
|Supervisor/Worker role separation matters|Simple coordination needed|
|Wave execution needs session persisting across time|Single-session orchestration|

---

## Phase 1 — Swarm Initialization

The Supervisor agent activates and:

1. Reads the goal and identifies all atomic sub-tasks
2. Validates that sub-tasks don't share output files
3. Estimates context budget per worker
4. Writes initial state to task.md

---

## Phase 2 — Worker Dispatch Contracts

Every worker receives a structured JSON contract (not natural language):

```json
{
  "task_id": "audit-auth-routes",
  "worker_type": "backend-specialist",
  "scope": "Audit all files in src/app/api/auth/ for security and type safety",
  "files_to_read": [
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/register/route.ts",
    "src/middleware.ts"
  ],
  "files_to_write": [],
  "context_summary": [
    "Next.js 15 App Router project",
    "Auth uses next-auth v5 (auth.ts pattern)",
    "Database: Prisma 6 on PostgreSQL"
  ],
  "constraints": [
    "Report findings only — do not modify files",
    "Report BLOCKED if you cannot determine auth pattern from provided files"
  ],
  "output_format": {
    "status": "COMPLETE | BLOCKED | ERROR",
    "findings": ["list of specific issues found with file+line references"],
    "summary": "2-3 sentence summary"
  }
}
```

---

## Phase 3 — Payload Validation

Before dispatching, validate all worker contracts:

```bash
python .agent/scripts/swarm_dispatcher.py --file payload.json
```

If validation passes → dispatch workers in parallel.
If validation fails → fix payload before dispatch.

---

## Phase 4 — Fan-Out Execution

```
Wave dispatch: POST all contracts simultaneously
               ↓
               Wait for completion via allSettled (not Promise.all)
               ↓
               Collect ALL results — COMPLETE + BLOCKED + ERROR
               ↓
Fan-In:        Supervisor aggregates, resolves conflicts
               ↓
               Human Gate before writing anything to disk
```

**allSettled vs Promise.all:** A single failed worker must NOT cancel all sibling workers. Collect all results, then handle failures.

---

## Phase 5 — Status Protocol

Workers report exactly one of three terminal statuses:

```
COMPLETE: Work done. Include output_format fields.

BLOCKED: Cannot proceed without missing prerequisite.
  blocked_by: [specific missing information]
  unblocked_by: [what must happen first]
  → Supervisor: provide missing input or escalate to human

ERROR: Unrecoverable after 3 attempts.
  error: [specific message]
  attempts: 3
  → Supervisor: report to human with ⚠️ Agent Failure Report
```

---

## Phase 6 — Session Persistence

Supervisor writes task.md after each wave:

```markdown
# Swarm Session: [goal-slug]

## Wave 1 — [timestamp]
- [task-id]: COMPLETE — [2-line summary]
- [task-id]: BLOCKED — [reason] → redispatched with [context added]

## Issues Carrying Forward
- [cross-task issue affecting Wave 2]

## Human Gate Status
- [ ] Pending review
```

---

## Phase 7 — Human Gate

```
━━━ Swarm Complete ━━━━━━━━━━━━━━━━━━━━━░░░

Workers: [N dispatched / N complete / N blocked / N error]

━━━ Synthesized Results ━━━━━━━━━━━━━━━━━━
[Findings by severity — critical → high → medium → low]

━━━ Files to Write ━━━━━━━━━━━━━━━━━━━━━━
[List all files with change summaries]

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━
Approve?  Y = write to disk | N = discard | R = revise
```

---

## Failure Report Format

```
⚠️ Agent Failure Report
━━━━━━━━━━━━━━━━━━━━━
Agent:       backend-specialist (Worker A)
Task:        audit-auth-routes
Attempts:    3 of 3
Last Error:  Could not resolve auth.ts import path — tsconfig paths not in scope
Context:     Files provided: src/app/api/auth/*.ts — missing: tsconfig.json
Suggestion:  Include tsconfig.json in files_to_read for next dispatch
```

---

## Usage Examples

```
/swarm comprehensive pre-launch audit: security + tests + performance + accessibility
/swarm analyze all API routes for OWASP vulnerabilities simultaneously
/swarm generate full test suite for auth, checkout, and user management
/swarm review and optimize all N+1 query patterns across the codebase
```
