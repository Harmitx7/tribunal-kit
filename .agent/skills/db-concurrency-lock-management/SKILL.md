---
name: db-concurrency-lock-management
description: "Use when managing database row locks, optimistic vs pessimistic locking, ACID isolation levels, preventing deadlocks, and handling concurrent transactions."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - error-resilience
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "db concurrency lock management"
  - "deadlock prevention database"
  - "select for update skip locked"
  - "optimistic concurrency control"
  - "transaction isolation levels"
  - "pessimistic locking postgresql"
---

# Database Concurrency, Isolation Levels & Deadlock Resolution

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `db-concurrency-lock-management` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Determine transaction isolation level (Read Committed, Repeatable Read, or Serializable)
2. **Runtime Context & Platform Invariants**: Identify critical concurrent resources (inventory, user balances, ticket seats, task queues)
3. **Execution Guardrails**: Verify resource locking order across all endpoints to prevent circular deadlock dependencies
4. **Validation & Type Contracts**: Inspect lock acquisition timeouts (`lock_timeout`) to prevent thread pool starvation
5. **Observability & Proof of Execution**: Determine whether optimistic locking (`version_id`) or pessimistic locking (`FOR UPDATE`) is appropriate

## Activation Boundaries
- **Activate when:** Use when managing database row locks, optimistic vs pessimistic locking, ACID isolation levels, preventing deadlocks, and handling concurrent transactions.
- **DO NOT activate when:** The task falls outside the `db-concurrency-lock-management` domain or is managed by a different dedicated specialist agent.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Invariants
1. **Enforce consistent lock ordering**: always lock resources in the same alphabetical or numerical primary key order across all transactions to mathematically prevent deadlocks.
2. **Use `FOR UPDATE SKIP LOCKED` for task queues**: allow multiple parallel worker threads to grab distinct pending records without blocking each other.
3. **Keep transactions hyper-short**: never perform external network HTTP requests, file uploads, or password hashing inside an open database transaction.
4. **Use Optimistic Concurrency Control (OCC) for low-contention web edits**: verify `WHERE id = ? AND version = ?` to detect lost updates.

## Hallucination Traps (Read First)
❌ Running long external Stripe/API calls inside a `BEGIN ... COMMIT` block → ✅ Call external APIs before or after the database transaction; never hold DB locks during network calls
❌ Using `SELECT FOR UPDATE` without order when updating multiple rows → ✅ Always sort IDs first: `SELECT * FROM accounts WHERE id IN (3, 7) ORDER BY id FOR UPDATE`
❌ Retrying serializable isolation failures without exponential backoff → ✅ When handling SQLSTATE `40001` (serialization_failure), retry with randomized jitter
❌ Polling task queues with plain `SELECT ... UPDATE` causing race conditions → ✅ Use `SELECT id FROM queue WHERE status = "PENDING" LIMIT 10 FOR UPDATE SKIP LOCKED`

---

### 1. High-Throughput Queue Processing with SKIP LOCKED
```sql
-- Worker grabs up to 5 jobs without blocking other concurrent workers
WITH claimed_jobs AS (
  SELECT id
  FROM background_jobs
  WHERE status = 'PENDING'
    AND scheduled_at <= NOW()
  ORDER BY priority DESC, id ASC
  LIMIT 5
  FOR UPDATE SKIP LOCKED
)
UPDATE background_jobs
SET status = 'PROCESSING',
    locked_at = NOW(),
    worker_id = 'worker_node_42'
WHERE id IN (SELECT id FROM claimed_jobs)
RETURNING *;
```

### 2. Optimistic Concurrency Control (OCC) Pattern
```typescript
async function updateDocument(id: string, newContent: string, currentVersion: number) {
  const result = await db.query(
    `UPDATE documents
     SET content = $1, version = version + 1, updated_at = NOW()
     WHERE id = $2 AND version = $3
     RETURNING version`,
    [newContent, id, currentVersion]
  );

  if (result.rowCount === 0) {
    throw new OptimisticLockConflictError(
      `Document ${id} was modified concurrently by another user. Please refresh and retry.`
    );
  }
  return result.rows[0].version;
}
```

---

## Diagnostic Procedures & Verification Commands
### Deadlock Diagnostics
1. Inspect currently active blocked transactions and waiting locks:
   ```sql
   SELECT blocked_locks.pid AS blocked_pid,
          blocking_locks.pid AS blocking_pid,
          blocked_activity.query AS blocked_statement,
          blocking_activity.query AS current_statement_in_blocking_process
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks
     ON blocking_locks.locktype = blocked_locks.locktype
     AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
     AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
     AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
     AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
     AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
     AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
     AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
     AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
     AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
     AND blocking_locks.pid != blocked_locks.pid
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;
   ```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?
✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?
✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?
✅ Did I verify table and column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


