---
name: safe-data-backfill
description: "Use when writing, executing, and auditing large-scale production data backfills, batched updates, keyset pagination, and throttled data migrations."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - error-resilience
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "safe data backfill"
  - "batched database backfill"
  - "large scale data migration"
  - "keyset pagination backfill"
  - "throttled backfill job"
  - "production data backfill"
---

# Safe Production Data Backfill & Batched Migration Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `safe-data-backfill` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Calculate total row volume and estimate execution duration at 500-1,000 rows/second
2. **Runtime Context & Platform Invariants**: Verify primary key indexing to enable keyset pagination (`WHERE id > ? ORDER BY id ASC LIMIT ?`)
3. **Execution Guardrails**: Configure sleep intervals between batches (e.g. 50-100ms) to allow replication catch-up and WAL flushing
4. **Validation & Type Contracts**: Confirm idempotency: ensure running the backfill script twice produces identical results without duplication
5. **Observability & Proof of Execution**: Verify whether target database has active read replicas to monitor replication lag during execution

## Activation Boundaries
- **Activate when:** Use when writing, executing, and auditing large-scale production data backfills, batched updates, keyset pagination, and throttled data migrations.
- **DO NOT activate when:** The task falls outside the `safe-data-backfill` domain or is managed by a different dedicated specialist agent.

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
1. **Never update millions of rows in a single SQL statement (`UPDATE users SET ...`)**: large updates lock entire tables, exhaust undo logs, and crash replication.
2. **Always use keyset pagination (ID ranges)**: never use `OFFSET` which degrades quadratically ($O(N^2)$) on large tables.
3. **Include dry-run mode**: backfill scripts must support a `--dry-run` flag that prints planned modifications without writing.
4. **Record progress in persistent storage**: backfills must be resumable if interrupted or aborted.

## Hallucination Traps (Read First)
❌ Updating rows using `OFFSET 100000 LIMIT 1000` → ✅ Use keyset ordering: `WHERE id > last_seen_id ORDER BY id ASC LIMIT 1000`
❌ Running backfills without sleep delays between batches → ✅ Insert `sleep(100)` between chunks to prevent WAL replication lag spikes
❌ Non-idempotent updates (e.g. `counter = counter + 1`) without state checks → ✅ Guard updates: `WHERE backfilled_at IS NULL`
❌ Triggering database table audit logs or email notifications on millions of backfilled rows → ✅ Disable user-facing event emitters during historical backfill jobs

---

### 1. Resumable Batched Backfill Script (TypeScript)
```typescript
import { pool } from '../src/db';

interface BackfillOptions {
  batchSize: number;
  sleepMs: number;
  dryRun: boolean;
}

export async function runBackfill(options: BackfillOptions) {
  const { batchSize = 1000, sleepMs = 50, dryRun = false } = options;
  console.log(`Starting backfill (Batch: ${batchSize}, Sleep: ${sleepMs}ms, DryRun: ${dryRun})...`);

  let lastId = '00000000-0000-0000-0000-000000000000';
  let totalProcessed = 0;

  while (true) {
    // 1. Fetch next batch via Keyset Pagination
    const res = await pool.query(
      `SELECT id, first_name, last_name
       FROM users
       WHERE id > $1 AND full_name IS NULL
       ORDER BY id ASC
       LIMIT $2`,
      [lastId, batchSize]
    );

    if (res.rows.length === 0) {
      console.log('✔ Backfill complete! Processed rows:', totalProcessed);
      break;
    }

    lastId = res.rows[res.rows.length - 1].id;
    totalProcessed += res.rows.length;

    if (!dryRun) {
      // 2. Perform batched update inside a small transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE users
           SET full_name = TRIM(first_name || ' ' || last_name)
           WHERE id = ANY($1::uuid[])`,
          [res.rows.map(r => r.id)]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Batch failed around ID:', lastId, err);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`Processed batch up to ${lastId} (Total: ${totalProcessed})`);

    // 3. Throttle sleep to protect database IOPS and replication lag
    await new Promise(r => setTimeout(r, sleepMs));
  }
}
```

---

## Diagnostic Procedures & Verification Commands
### Execution Command
```bash
# Run dry-run first
node scripts/backfill_users.js --dry-run

# Run live batched backfill
node scripts/backfill_users.js --batch=1000 --sleep=50
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


