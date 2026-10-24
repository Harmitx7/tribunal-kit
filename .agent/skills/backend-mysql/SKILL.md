---
name: backend-mysql
description: "Use when analyzing, optimizing, and securing MySQL and MariaDB databases. Covers InnoDB storage engine, composite index left-prefix rule, locking & deadlocks, transactions, connection pooling, and utf8mb4 collation."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - database-design
  - sql-pro
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
  - "mysql"
  - "analyzing"
---

# MySQL & MariaDB Architecture & Performance Mastery

## Activation Boundaries
- **Activate when:** Use when analyzing, optimizing, and securing MySQL and MariaDB databases. Covers InnoDB storage engine, composite index left-prefix rule, locking & deadlocks, transactions, connection pooling, and utf8mb4 collation.
- **DO NOT activate when:** The task falls outside the `backend-mysql` domain or is managed by a different dedicated specialist agent.


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
1. **Engine Verification**: Confirm all tables use InnoDB engine (`ENGINE=InnoDB`); reject MyISAM.
2. **Charset & Collation**: Enforce `utf8mb4` and `utf8mb4_0900_ai_ci` (or `utf8mb4_unicode_ci` for older versions); reject 3-byte `utf8`.
3. **Transaction Isolation**: Identify active isolation level (`REPEATABLE READ` is MySQL default; watch for Next-Key locking gaps).
4. **Foreign Key Integrity**: Check cascade definitions and verify indexes exist on all child FK columns.
5. **Slow Query Verification**: Inspect query plans with `EXPLAIN FORMAT=JSON` to check `type`, `possible_keys`, `key_len`, and `rows`.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Left-Prefix Index Rule & Optimization
```sql
-- For query: WHERE tenant_id = 12 AND created_at >= '2026-01-01' ORDER BY status
-- ❌ Ineffective Index:
CREATE INDEX idx_bad ON orders(created_at, tenant_id, status);

-- ✅ Optimal Index: Equality first, then range/sort
CREATE INDEX idx_optimal ON orders(tenant_id, created_at, status);
```

### 2. Deadlock Prevention Pattern
```sql
-- Always acquire locks on multiple rows in deterministic primary key order
-- Transaction A & B both update accounts #101 and #202:
BEGIN;
-- Sort IDs in application code before querying: [101, 202]
SELECT id, balance FROM accounts WHERE id IN (101, 202) ORDER BY id FOR UPDATE;

UPDATE accounts SET balance = balance - 50 WHERE id = 101;
UPDATE accounts SET balance = balance + 50 WHERE id = 202;
COMMIT;
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Large Offset Pagination** | `LIMIT 500000, 20` scans 500,020 rows causing severe IO latency | Use keyset (cursor) pagination: `WHERE id > :last_seen_id ORDER BY id ASC LIMIT 20` |
| **Implicit Type Conversion** | Comparing VARCHAR column to numeric literal causes full table scan | Match data types strictly in query bindings (`WHERE phone = '12345'`) |
| **Deadlock on Next-Key Lock** | `REPEATABLE READ` locks gap between rows, causing deadlocks on concurrent inserts | Switch to `READ COMMITTED` with row-based replication (`binlog_format=ROW`) |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Old `utf8` Charset** | Specifying `CHARACTER SET utf8` which only supports 3-byte characters | Always specify `CHARACTER SET utf8mb4` to support emojis and 4-byte Unicode |
| **Unindexed `UPDATE/DELETE`** | Running `UPDATE ... WHERE status = 'X'` without index | Without an index, InnoDB locks every record in the table, blocking the entire database |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `sql-pro`, `security-auditor`
- **Evidence Standard:** Maintain strict separation of `[OBSERVED]` code, `[INFERRED]` execution plans, and `[UNVERIFIED]` performance metrics.


## Verification (Auto-Remediated)

- [ ] **Verify Execution**: Ensure the output matches the original task requirements.
- [ ] **Safety Check**: Validate that no destructive actions occurred outside the requested scope.
