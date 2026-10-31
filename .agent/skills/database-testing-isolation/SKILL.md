---
name: database-testing-isolation
description: "Use when establishing isolated database testing environments, transactional test rollbacks, ephemeral schemas, and deterministic test data seeding."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - testing-patterns
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "database testing isolation"
  - "transactional test rollback"
  - "ephemeral test schema"
  - "isolated database test runner"
  - "database test fixture isolation"
  - "test db state reset"
---

# Database Test Isolation & Transaction Rollback Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `database-testing-isolation` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm test runner parallelization strategy (worker threads vs distinct processes)
2. **Runtime Context & Platform Invariants**: Determine isolation boundary: Transaction rollback (`BEGIN`/`ROLLBACK`) vs Schema-per-worker vs Ephemeral DB
3. **Execution Guardrails**: Verify that database migrations run automatically on fresh test databases prior to test execution
4. **Validation & Type Contracts**: Ensure static reference data (roles, currencies, countries) is seeded once during setup
5. **Observability & Proof of Execution**: Verify clean teardown hooks exist to prevent abandoned test schemas

## Activation Boundaries
- **Activate when:** Use when establishing isolated database testing environments, transactional test rollbacks, ephemeral schemas, and deterministic test data seeding.
- **DO NOT activate when:** The task falls outside the `database-testing-isolation` domain or is managed by a different dedicated specialist agent.

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
1. **Never allow tests to mutate shared database state without rollback**: a failure in Test A must never cause Test B to fail.
2. **Transaction rollback is the fastest isolation strategy**: wrap each test case in a transaction and execute `ROLLBACK` in `afterEach`.
3. **For tests that verify commit semantics or background workers, use schema-per-worker isolation (`SET search_path TO worker_3`).**: For tests that verify commit semantics or background workers, use schema-per-worker isolation (`SET search_path TO worker_3`).
4. **Never use SQLite in tests if production is PostgreSQL**: dialect discrepancies (JSONB, locks, constraints, timestamps) produce false-positive passes.

## Hallucination Traps (Read First)
❌ Truncating all 50 tables between every test case → ✅ Wrap individual tests in `BEGIN ... ROLLBACK` for sub-millisecond isolation
❌ Running parallel test workers against the exact same database without schema namespaces → ✅ Suffix database or schema with `process.env.VITEST_WORKER_ID`
❌ Leaving committed test records in a shared CI database → ✅ Enforce ephemeral test database lifecycles
❌ Mocking the entire database layer with in-memory arrays → ✅ Test queries against real database engines to validate SQL syntax and foreign keys

---

### 1. Ultra-Fast Transaction Rollback Isolation (TypeScript)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../../src/db';
import { createUser, getUserById } from '../../src/repos/user';

describe('User Repository - Transaction Rollback Isolation', () => {
  let client: any;

  beforeEach(async () => {
    // Check out dedicated client and begin transaction
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    // ALWAYS rollback - database is 100% restored to original state!
    await client.query('ROLLBACK');
    client.release();
  });

  it('creates user without polluting database for subsequent tests', async () => {
    const user = await createUser(client, { email: 'isolated@test.com', name: 'Alice' });
    expect(user.id).toBeDefined();

    const fetched = await getUserById(client, user.id);
    expect(fetched?.email).toBe('isolated@test.com');
  });

  it('proves database was untouched by previous test', async () => {
    const fetched = await client.query('SELECT * FROM users WHERE email = $1', ['isolated@test.com']);
    expect(fetched.rows).toHaveLength(0); // Clean state!
  });
});
```

### 2. Schema-per-Worker Isolation for Parallel CI
```typescript
// globalSetup.ts
export async function setup() {
  const workerId = process.env.VITEST_WORKER_ID || '0';
  const schemaName = `test_schema_${workerId}`;

  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
  await pool.query(`SET search_path TO ${schemaName}, public;`);
  // Run migrations into this worker's isolated schema
}
```

---

## Diagnostic Procedures & Verification Commands
### Verification Command
```bash
# Run isolated database test suite concurrently with 4 workers
npx vitest run tests/db/ --maxWorkers=4
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


