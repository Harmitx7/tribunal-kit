---
name: backend-postgresql
description: "Use when analyzing, designing, optimizing, and securing PostgreSQL databases. Covers B-Tree/GIN/BRIN indexing, query plans (EXPLAIN ANALYZE), connection pooling with PgBouncer, transactions, MVCC, locking, and JSONB optimization."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - database-design
  - sql-pro
  - backend-security-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "backend"
  - "postgresql"
  - "analyzing"
---

# PostgreSQL Mastery — High-Performance & Hardened Architecture

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


## Mandatory Pre-Flight Context Inspection
Before running or proposing PostgreSQL schema changes or queries, inspect:
1. **Active Engine & Version**: Verify PostgreSQL major version (14, 15, 16+) and connection pooling (PgBouncer in transaction vs session mode).
2. **Schema Definition**: Read the canonical DDL / migration files; never guess column names, types, or foreign key cascades.
3. **Index Cardinality**: Check existing indices before proposing new indices; avoid duplicate or overlapping composite indices.
4. **Transaction Boundaries**: Identify read-only vs read-write transactions; ensure non-interactive transactions commit immediately.
5. **Execution Proof**: Verify query plans using `EXPLAIN (ANALYZE, BUFFERS)` in a safe non-production environment.

## Activation Boundaries
- **Activate when:** Designing schemas, writing complex SQL, optimizing slow queries, resolving lock contention, or securing PostgreSQL against SQLi.
- **DO NOT activate when:** The target database is MongoDB, Redis, or SQLite, or the task is purely client-side UI.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Zero-Downtime Safe Index Creation
```sql
-- ❌ BAD: Locks entire table against writes during build
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- ✅ PRODUCTION SAFE: Builds concurrently without locking writes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
```

### 2. Composite Index Left-Prefix Ordering & Filtered Indexing
```sql
-- Composite index for: WHERE tenant_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC
-- Column order rule: Equality columns first (tenant_id, status), then range/sort columns (created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status_created 
ON orders (tenant_id, status, created_at DESC);

-- Partial index for high-skew tables (only index actionable rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_pending 
ON background_jobs (priority, scheduled_at) 
WHERE status = 'PENDING';
```

### 3. Concurrency & Pessimistic Row Locking
```sql
-- Prevent double-spend or duplicate reservation without blocking unrelated rows
BEGIN;
SELECT id, balance 
FROM accounts 
WHERE id = $1 
FOR UPDATE;

UPDATE accounts 
SET balance = balance - $2, updated_at = NOW() 
WHERE id = $1;
COMMIT;
```

### 4. High-Performance JSONB Querying with GIN
```sql
-- JSONB containment indexing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_payload_gin 
ON event_logs USING gin (payload jsonb_path_ops);

-- Query using containment operator (@>) to utilize the index
SELECT id, payload 
FROM event_logs 
WHERE payload @> '{"event_type": "checkout_completed"}';
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **PgBouncer Transaction Pooling** | Prepared statements fail with `prepared statement does not exist` | Configure named prepared statements off, or use PgBouncer 1.21+ with statement prep support |
| **Long-Running Transaction** | Bloats MVCC dead tuples, prevents autovacuum cleanup, table bloat | Set `idle_in_transaction_session_timeout = '15s'` and `statement_timeout = '30s'` |
| **Table Lock on Heavy ALTER** | Adding column with default in PG < 11 rewrites table, blocking all traffic | Add column as NULL, backfill in batches, then set default and NOT NULL |
| **Integer Overflow on PK** | 32-bit INT maxes out at 2.14B rows, causing system write freeze | Always define surrogate primary keys as `BIGINT GENERATED ALWAYS AS IDENTITY` |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **`SELECT *` in Production** | Fetches all columns including heavy TOAST/JSONB data | Explicitly select only necessary columns to minimize network and memory IO |
| **Unparameterized String SQL** | Interpolating template literals `WHERE email = '${email}'` | Use parameterized placeholders ($1, $2) or type-safe query builders |
| **Missing Foreign Key Indexes** | Assuming `FOREIGN KEY` creates an index automatically | PostgreSQL does NOT index FKs automatically; always create matching index to avoid full table locks on DELETE |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `sql-pro`, `security-auditor`, `resilience-reviewer`
- **Evidence Requirement:** Every finding must explicitly state:
  - `[OBSERVED]`: Concrete table, column, and SQL statement from repository.
  - `[INFERRED]`: Anticipated query plan behavior or locking risk.
  - `[UNVERIFIED]`: Runtime metrics absent from static code.
- **Verification Command:** Run `EXPLAIN ANALYZE` or execute DB migration linter.
