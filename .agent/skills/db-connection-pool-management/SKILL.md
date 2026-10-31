---
name: db-connection-pool-management
description: "Use when configuring, sizing, and troubleshooting database connection pools (PgBouncer, Supavisor, HikariCP), preventing pool exhaustion and connection leaks."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - backend-postgresql
  - throughput-optimizer
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
  - "db connection pool management"
  - "pgbouncer configuration"
  - "connection pool exhaustion"
  - "supavisor connection pooling"
  - "hikaricp connection pool"
  - "database connection leak"
---

# Database Connection Pool Architecture & Resource Reliability

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `db-connection-pool-management` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Identify target runtime environment (Long-running containers vs Ephemeral serverless functions)
2. **Runtime Context & Platform Invariants**: Calculate maximum safe database connection limit based on server RAM and CPU cores
3. **Execution Guardrails**: Select pooling mode: Transaction pooling (default for web apps) vs Session pooling (stateful)
4. **Validation & Type Contracts**: Inspect application statement and idle transaction timeouts
5. **Observability & Proof of Execution**: Verify whether prepared statements or named portals are compatible with pooling mode

## Activation Boundaries
- **Activate when:** Use when configuring, sizing, and troubleshooting database connection pools (PgBouncer, Supavisor, HikariCP), preventing pool exhaustion and connection leaks.
- **DO NOT activate when:** The task falls outside the `db-connection-pool-management` domain or is managed by a different dedicated specialist agent.

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
1. **More connections != faster performance**: optimal pool size is approximately `(CPU cores * 2) + effective_spindle_count`. Excess connections cause CPU context-switching thrashing.
2. **Always set `idle_in_transaction_session_timeout`**: connections left idle inside open transactions hold locks and table vacuum blocks indefinitely.
3. **Use Transaction Mode pooling for serverless and auto-scaling workloads**: release server connections back to pool immediately after statement execution.
4. **Always set strict connection acquisition timeouts**: clients must fail fast (`connectionTimeoutMillis: 2000`) rather than hanging requests indefinitely during traffic surges.

## Hallucination Traps (Read First)
❌ Opening 500 connections from 50 serverless function instances directly to Postgres → ✅ Route serverless connections through PgBouncer or Supavisor
❌ Forgetting to release connections back to the pool in `finally` blocks → ✅ Always use connection pool checkout wrappers or ORM-managed lifecycles
❌ Using `SET search_path` or prepared statements inside PgBouncer Transaction Mode without transaction-scoped wrappers → ✅ In transaction mode, session-level state bleeds into other clients
❌ Setting infinite statement timeouts allowing a single rogue analytics query to monopolize database CPU → ✅ Set `statement_timeout = "30s"` globally

---

### 1. PgBouncer Production Configuration (`pgbouncer.ini`)
```ini
[databases]
app_production = host=127.0.0.1 port=5432 dbname=app_production

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Transaction pooling mode: connection returned as soon as transaction completes
pool_mode = transaction

# Connection limits
max_client_conn = 5000       # Up to 5000 client frontend connections
default_pool_size = 50       # Up to 50 real PostgreSQL backend connections
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 5.0

# Timeout guards
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 60.0
```

### 2. Node.js `pg` Pool Configuration with Leak Defense
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                               // Max active connections per container
  idleTimeoutMillis: 30000,              // Close idle connections after 30s
  connectionTimeoutMillis: 2000,         // Fail fast if pool exhausted (2s)
  statement_timeout: 10000,              // Abort any query taking > 10s
  query_timeout: 10000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected idle client error in pool', err);
});

// Safe checkout wrapper preventing connection leaks
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release(); // Guaranteed release back to pool!
  }
}
```

---

## Diagnostic Procedures & Verification Commands
### Monitoring & Diagnostics
1. Check pool status and active connections:
   ```sql
   -- Query PgBouncer admin console
   SHOW POOLS;
   SHOW CLIENTS;
   SHOW SERVERS;
   ```
2. Check for idle-in-transaction connections on Postgres:
   ```sql
   SELECT pid, now() - state_change AS idle_duration, query
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
   ORDER BY idle_duration DESC;
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


