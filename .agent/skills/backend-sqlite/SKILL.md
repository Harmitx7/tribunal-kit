---
name: backend-sqlite
description: "Use when configuring, analyzing, and optimizing SQLite in backend, desktop, mobile, and embedded systems. Covers WAL mode, busy timeout, transaction concurrency, connection pooling singletons, and SQLite limitations."
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
  - "sqlite"
  - "analyzing"
---

# SQLite Architecture & Embedded Concurrency Mastery

## Activation Boundaries
- **Activate when:** Use when configuring, analyzing, and optimizing SQLite in backend, desktop, mobile, and embedded systems. Covers WAL mode, busy timeout, transaction concurrency, connection pooling singletons, and SQLite limitations.
- **DO NOT activate when:** The task falls outside the `backend-sqlite` domain or is managed by a different dedicated specialist agent.


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
1. **Journal Mode**: Verify `PRAGMA journal_mode = WAL` is enabled; default rollback journal serializes readers and writers.
2. **Busy Timeout**: Ensure `PRAGMA busy_timeout = 5000` is configured to avoid instant `SQLITE_BUSY` locks under contention.
3. **Connection Lifecycle**: Verify database connection is managed as a singleton per process; multi-connection write pools cause deadlocks.
4. **Foreign Key Enforcement**: Confirm `PRAGMA foreign_keys = ON` is executed on every opened connection (off by default in SQLite).
5. **Batch Transactions**: Wrap bulk insertions inside an explicit transaction (`BEGIN IMMEDIATE ... COMMIT`).

## 🛠️ Technical Architecture & Reference Recipes

### 1. Production Initialization Pragma Baseline
```typescript
import Database from 'better-sqlite3';

export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);

  // Critical SQLite Production Pragmas
  db.pragma('journal_mode = WAL');         // Enable Write-Ahead Logging for concurrent reads
  db.pragma('busy_timeout = 5000');        // Wait up to 5s before throwing SQLITE_BUSY
  db.pragma('synchronous = NORMAL');       // Fast and safe under WAL mode
  db.pragma('foreign_keys = ON');          // Enforce relational foreign keys
  db.pragma('cache_size = -64000');        // 64MB memory page cache
  db.pragma('temp_store = MEMORY');        // Store temporary tables and indices in RAM

  return db;
}
```

### 2. Immediate Transaction for Concurrent Write Safety
```typescript
// Prevent upgrading read lock to write lock mid-transaction (which triggers SQLITE_BUSY)
const transfer = db.transaction((fromAccount: string, toAccount: string, amount: number) => {
  // BEGIN IMMEDIATE acquires write lock up front
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromAccount);
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toAccount);
});

// Execute transaction
transfer('acc_1', 'acc_2', 100);
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Multiple Write Connections** | Concurrent connections attempting writes cause `SQLITE_BUSY: database is locked` | Restrict SQLite writes to a single connection queue or thread; read connections can scale |
| **Network Filesystem (NFS/SMB)** | SQLite locking mechanisms break on network shares, corrupting database | Never mount SQLite DB files over NFS/CIFS; keep storage on local NVMe/SSD |
| **WAL File Unbounded Growth** | Checkpoint never completes due to long continuous readers | Execute periodic `PRAGMA wal_checkpoint(TRUNCATE)` or set checkpoint limits |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Insert Loop without Transaction** | Executing 1,000 `INSERT` statements individually (takes seconds) | Wrap in a single transaction `BEGIN ... COMMIT` (takes 10 milliseconds) |
| **ALTER TABLE Incompatibilities** | Attempting complex column drops/renames in older SQLite versions | Use 12-step table migration: create new table, copy data, drop old, rename new |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `sql-pro`, `resilience-reviewer`
- **Evidence Standard:** Differentiate `[OBSERVED]` pragmas, `[INFERRED]` locking behaviors, and `[UNVERIFIED]` runtime metrics.
