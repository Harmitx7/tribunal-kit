---
name: zero-downtime-migrations
description: "Use when planning, executing, and automating non-blocking database schema migrations using expand-and-contract patterns, concurrent indexing, and lock-free table alterations."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - backend-postgresql
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "zero downtime migrations"
  - "safe schema migration"
  - "expand and contract pattern"
  - "non blocking index creation"
  - "concurrent index creation"
  - "online schema migration"
---

# Zero-Downtime Database Migration & Schema Evolution Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `zero-downtime-migrations` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Inspect table size and active query throughput to estimate lock acquisition risks
2. **Runtime Context & Platform Invariants**: Verify whether target database engine is PostgreSQL 11+, MySQL 8.0, or SQLite
3. **Execution Guardrails**: Check lock timeouts and statement timeouts before running DDL transactions
4. **Validation & Type Contracts**: Ensure index creation uses CONCURRENTLY (Postgres) or ALGORITHM=INPLACE (MySQL)
5. **Observability & Proof of Execution**: Confirm rollback plans (Down migrations or forward-compatible schema decoupling)

## Activation Boundaries
- **Activate when:** Use when planning, executing, and automating non-blocking database schema migrations using expand-and-contract patterns, concurrent indexing, and lock-free table alterations.
- **DO NOT activate when:** The task falls outside the `zero-downtime-migrations` domain or is managed by a different dedicated specialist agent.

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
1. **Never execute exclusive table rewrites in peak traffic**: adding columns with volatile defaults or altering types blocks all reads and writes.
2. **Always expand before contract**: write new code that reads from old or new columns; write to both columns; only drop old columns in a subsequent release.
3. **Create indexes concurrently**: `CREATE INDEX CONCURRENTLY` avoids taking an `ACCESS EXCLUSIVE` lock on PostgreSQL tables.
4. **Add foreign keys as `NOT VALID` first**: validate them in a separate transaction with `VALIDATE CONSTRAINT` to avoid scanning the table under lock.

## Hallucination Traps (Read First)
❌ Adding `NOT NULL` without default on pre-Postgres 11 databases → ✅ Add column as nullable, backfill values in chunks, add `CHECK (col IS NOT NULL) NOT VALID`, then validate
❌ Renaming columns directly in production SQL (`ALTER TABLE users RENAME COLUMN email TO user_email`) → ✅ Add `user_email`, mirror writes, switch reads, then drop `email` across releases
❌ Running `CREATE INDEX CONCURRENTLY` inside an active transaction block → ✅ Concurrent index creation cannot run inside multi-statement transactions in Postgres
❌ Setting long lock timeouts when acquiring DDL locks → ✅ Set `SET lock_timeout = "2s"` so migrations abort cleanly rather than queuing behind long-running queries and causing a connection spike

---

### 1. PostgreSQL Safe Constraint & Column Addition Pattern
```sql
-- Step 1: Set safe lock timeout so DDL never blocks normal traffic
SET lock_timeout = '2s';
SET statement_timeout = '10s';

-- Step 2: Add column as NULLABLE (Instant metadata operation in Postgres)
ALTER TABLE orders ADD COLUMN fulfillment_status VARCHAR(32);

-- Step 3: Create index concurrently without locking reads/writes
COMMIT; -- Must commit before concurrent operations!
CREATE INDEX CONCURRENTLY idx_orders_fulfillment_status
ON orders (fulfillment_status)
WHERE fulfillment_status IS NOT NULL;

-- Step 4: Add foreign key constraint without blocking table scans
ALTER TABLE orders
ADD CONSTRAINT fk_orders_customer
FOREIGN KEY (customer_id) REFERENCES customers (id)
NOT VALID;

-- Step 5: Validate constraint in background without ACCESS EXCLUSIVE lock
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;
```

### 2. Expand-and-Contract Migration Lifecycle
| Phase | Database State | Application Code | Action |
|:---|:---|:---|:---|
| **Phase 1: Expand** | Add new column `new_col` (nullable) | Deploy app writing to both `old_col` and `new_col`; reading from `old_col` | Safe forward-compatible |
| **Phase 2: Backfill** | Both columns exist | Background batched worker copies data from `old_col` to `new_col` | Keyset-paginated batches |
| **Phase 3: Switch** | All rows have `new_col` | Deploy app reading from `new_col`; still writing to both | Instant rollback possible |
| **Phase 4: Contract** | Drop `old_col` and triggers | Deploy app reading/writing only `new_col` | Migration finalized |

---

## Diagnostic Procedures & Verification Commands
### Verification & Safety Audit
1. Verify pending migration does not take ACCESS EXCLUSIVE lock without timeout:
   ```bash
   node scripts/verify_migration_safety.js path/to/migration.sql
   ```
2. Check for active table lock contention during test migration:
   ```sql
   SELECT pid, mode, granted, query FROM pg_locks l JOIN pg_stat_activity a ON l.pid = a.pid WHERE relation = 'orders'::regclass;
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


