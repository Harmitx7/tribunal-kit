---
name: database-indexing-tuning
description: "Use when analyzing execution plans with EXPLAIN ANALYZE, designing B-Tree, GIN, and BRIN indexes, eliminating sequential scans, and fixing index bloat."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - backend-postgresql
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
  - "database indexing tuning"
  - "explain analyze query plan"
  - "index optimization postgresql"
  - "eliminate sequential scan"
  - "covering index include"
  - "b-tree gin brin index"
---

# Database Query Plan (EXPLAIN ANALYZE) & Index Tuning Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `database-indexing-tuning` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Collect real execution plan with `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`
2. **Runtime Context & Platform Invariants**: Check table cardinality, row counts, and buffer cache hit ratios
3. **Execution Guardrails**: Inspect query WHERE, JOIN, and ORDER BY clauses to determine composite index ordering
4. **Validation & Type Contracts**: Verify whether query benefits from Covering Index (`INCLUDE`) to enable Index-Only Scans
5. **Observability & Proof of Execution**: Audit existing indexes on target table to avoid duplicate or redundant overlapping indexes

## Activation Boundaries
- **Activate when:** Use when analyzing execution plans with EXPLAIN ANALYZE, designing B-Tree, GIN, and BRIN indexes, eliminating sequential scans, and fixing index bloat.
- **DO NOT activate when:** The task falls outside the `database-indexing-tuning` domain or is managed by a different dedicated specialist agent.

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
1. **Equality columns first, range columns last**: in composite B-Tree indexes, place columns filtered with `=` before columns filtered with `<`, `>`, `BETWEEN`, or `IN`.
2. **Use covering indexes (`INCLUDE`) to eliminate heap fetches**: when a query only reads 1-2 additional columns, include them in the index payload.
3. **Partial indexes save memory and speed up writes**: use `WHERE deleted_at IS NULL` or `WHERE status = "PENDING"` when querying small subsets of large tables.
4. **PostgreSQL does NOT auto-index foreign keys**: always create explicit indexes on referencing foreign key columns to avoid full table scans on parent deletes.

## Hallucination Traps (Read First)
❌ Indexing low-cardinality boolean columns globally (e.g. `is_active`) → ✅ Use a partial index (`WHERE is_active = true`) or combine with high-cardinality filters
❌ Applying SQL functions to indexed columns in WHERE (`WHERE LOWER(email) = ?`) → ✅ Create functional index (`CREATE INDEX ON users (LOWER(email))`)
❌ Putting range columns first in a composite index → ✅ If query is `WHERE tenant_id = 1 AND created_at > NOW()`, index must be `(tenant_id, created_at)`
❌ Over-indexing tables causing write amplification → ✅ Audit index usage with `pg_stat_user_indexes`; drop indexes with 0 scans

---

### 1. Interpreting EXPLAIN (ANALYZE, BUFFERS)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT id, order_number, total_cents, created_at
FROM orders
WHERE tenant_id = 't_100'
  AND status = 'SHIPPED'
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 50;
```

### 2. High-Performance Index Architecture
```sql
-- ❌ BAD: Sequential scan or heap fetch on 10,000,000 rows
-- Filter: (tenant_id = 't_100' AND status = 'SHIPPED' AND created_at >= '2026-01-01')
-- Rows Removed by Filter: 9,950,000 | Buffers: shared read=85,000

-- ✅ OPTIMAL: Equality first (tenant_id, status), Sort/Range next (created_at DESC), Payload INCLUDED
CREATE INDEX CONCURRENTLY idx_orders_tenant_status_created_covering
ON orders (tenant_id, status, created_at DESC)
INCLUDE (order_number, total_cents);

-- Result: "Index Only Scan using idx_orders_tenant_status_created_covering"
-- Heap Fetches: 0 | Buffers: shared hit=4 (0 reads from disk!) | Time: 0.12ms
```

### 3. GIN Index for JSONB and Array Search
```sql
-- Fast containment search: WHERE metadata @> '{"tier": "enterprise"}'
CREATE INDEX CONCURRENTLY idx_organizations_metadata_gin
ON organizations USING gin (metadata jsonb_path_ops);
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Performance Audit
1. Check for unused indexes wasting disk and write IOPS:
   ```sql
   SELECT schemaname, relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
   ORDER BY pg_relation_size(indexrelid) DESC;
   ```
2. Check table buffer cache hit ratio (should be > 99%):
   ```sql
   SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio FROM pg_statio_user_tables;
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


