---
name: database-design
description: Use when Database design mastery. Schema design with normalization, denormalization strategies, indexing, migration pipelines, ORM selection (Prisma/Drizzle/SQLAlchemy/EF Core), connection pooling, soft deletes, audit trails, multi-tenancy, and serverless database patterns. Use when designing schemas, choosing databases, planning migrations, or architecting data layers.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - supabase-postgres-best-practices
  - sql-pro
  - db-latency-auditor
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Database Design — Schema & Architecture Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `database-design` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Database design mastery. Schema design with normalization, denormalization strategies, indexing, migration pipelines, ORM selection (Prisma/Drizzle/SQLAlchemy/EF Core), connection pooling, soft deletes, audit trails, multi-tenancy, and serverless database patterns. Use when designing schemas, choosing databases, planning migrations, or architecting data layers.
- **DO NOT activate when:** The task falls outside the `database-design` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## 2026 Database Performance & Schema Invariants

1. **Time-Ordered UUID v7 (RFC 9562)**: When UUIDs are required across distributed systems, use UUID v7 so records append sequentially to B-tree indexes, avoiding fragmentation.
2. **Partial Indexing on Soft Deletes**:
   ```sql
   CREATE INDEX idx_users_active_email ON users (email) WHERE deleted_at IS NULL;
   ```
3. **Covering Indexes**: Use `INCLUDE (col_a, col_b)` to allow index-only scans without table heap lookups on read-heavy query patterns.
4. **Connection Pooling in Serverless**: Always route serverless connections through Supavisor, PgBouncer, or Neon connection poolers with transaction-mode pooling.

## Hallucination Traps (Read First)

- ❌ `TIMESTAMP` without timezone → ✅ Always `TIMESTAMPTZ`
- ❌ UUID v4 as primary key → ✅ UUID v7 (time-ordered) or `BIGINT GENERATED ALWAYS AS IDENTITY`
- ❌ Omitting indexes on foreign keys → ✅ Postgres does NOT auto-index FKs; always create explicit indexes
- ❌ Adding `NOT NULL` column without default directly on large tables → ✅ Add nullable first, backfill in batches, then set `NOT NULL`
- ❌ Soft delete without partial index → ✅ Always index `WHERE deleted_at IS NULL`
- ❌ Direct DB connection inside serverless functions → ✅ Use pooled connection string (PgBouncer/Supavisor)

---

## Database Selection

```
Relational / Complex queries → PostgreSQL (primary choice)
  Serverless PG              → Neon, Supabase
  Edge / Ultra-low latency   → Turso (SQLite @ edge)
  Simple / Embedded          → SQLite
  Global distribution (MySQL) → PlanetScale (no FK support)

Key-value / Cache            → Redis / Valkey / Upstash
Document store               → MongoDB / Firestore
Full-text search             → PostgreSQL tsvector (built-in) or Meilisearch / Typesense
Time-series                  → TimescaleDB / ClickHouse
Vector (AI embeddings)       → pgvector (PostgreSQL ext) / Pinecone / Weaviate
```

---

## Standard Table Template

```sql
CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- OR: id UUID DEFAULT gen_random_uuid() PRIMARY KEY (use v7 for perf)
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ  -- soft delete
);

-- Required: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Required indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL; -- partial index for soft delete
CREATE INDEX idx_users_created_at ON users (created_at DESC);
```

---

## Schema Patterns

### Relationships

```sql
-- One-to-Many: FK on the "many" side + INDEX
CREATE TABLE posts (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ...
);
CREATE INDEX idx_posts_author_id ON posts (author_id); -- REQUIRED in Postgres

-- Many-to-Many: junction table with composite PK
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag_id ON post_tags (tag_id); -- index the non-PK side
```

### Multi-Tenancy

```sql
-- Pattern 1: tenant_id column (simplest — enforce via RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON projects
    USING (tenant_id = current_setting('app.current_tenant_id')::bigint);

-- Pattern 2: Schema per tenant (better isolation, harder migrations)
-- CREATE SCHEMA tenant_acme;

-- Pattern 3: DB per tenant — only for compliance/regulatory needs
```

---

## ORM Selection

| ORM                | Best For                                | Trade-offs                 |
| ------------------ | --------------------------------------- | -------------------------- |
| **Drizzle**        | Edge, TypeScript, bundle-size sensitive | Newer, fewer examples      |
| **Prisma**         | DX, schema management, Prisma Studio    | Heavy, NOT edge-compatible |
| **Kysely**         | Type-safe SQL builder, full control     | Manual migrations          |
| **Raw SQL**        | Complex queries, performance-critical   | Manual type safety         |
| **SQLAlchemy 2.0** | Python async ecosystem                  | Python only                |

```typescript
// Drizzle — SQL-like, edge-compatible
const result = await db
  .select({ id: users.id, name: users.name })
  .from(users)
  .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
  .orderBy(desc(users.createdAt))
  .limit(20);

// Prisma — ❌ TRAP: can't express complex joins natively → use prisma.$queryRaw<Type>
const user = await prisma.user.findUnique({ where: { email }, include: { posts: { take: 10 } } });
```

---

## Migrations (Zero-Downtime Strategy)

```sql
-- Safe column add on a large production table:
-- Step 1: Add nullable (no lock)
ALTER TABLE users ADD COLUMN phone TEXT;
-- Step 2: Backfill in batches (non-blocking)
UPDATE users SET phone = '' WHERE phone IS NULL AND id BETWEEN 1 AND 10000;
-- Step 3: Add constraint AFTER all code deploys write the column
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

**Migration Rules:**

- Never modify a migration already applied to production — create a new one
- Remove column in 2 deploys: first remove all code references, then `DROP COLUMN`
- `CREATE INDEX CONCURRENTLY` to avoid table locks on existing data
- Test migrations against a copy of production data before running live

---

## Indexing Reference

| Index Type         | Use For                                              |
| ------------------ | ---------------------------------------------------- |
| **B-tree**         | General purpose — equality & range queries (default) |
| **Hash**           | Equality-only lookups (faster than B-tree for =)     |
| **GIN**            | JSONB, arrays, full-text (`tsvector`)                |
| **GiST**           | Geometric, range types                               |
| **HNSW / IVFFlat** | Vector similarity (pgvector)                         |

**Composite index column order:** equality columns first → range columns last → most selective first

---

## Audit Trail

```sql
CREATE TABLE audit_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL, record_id BIGINT NOT NULL,
    action     TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data   JSONB, new_data JSONB,
    changed_by BIGINT REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log USING brin (changed_at); -- BRIN for time-ordered append-only tables
```

---

## Connection Pooling

```
Without pooling: 100 concurrent requests → 100 DB connections → overwhelms DB
With pooling:    100 concurrent requests → 10–20 reused connections

Sizing formula: max_connections = (cpu_cores × 2) + disk_spindles  (typically 25–50)

Poolers:
  PgBouncer          → External, most common for self-hosted Postgres
  Prisma Accelerate  → Managed, for Prisma projects
  Supabase Supavisor → Managed, for Supabase projects
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Full Table Scan Blindspot** | Querying high-cardinality tables without index coverage | Verify query plans with EXPLAIN ANALYZE and add composite B-Tree indexes |
| **Non-Atomic Batch Mutation** | Executing multiple related DB writes sequentially without transaction wrapper | Wrap multi-table updates in an atomic transaction with automatic rollback |
| **Destructive Schema Migration** | Dropping or renaming columns in production without multi-phase migration | Use expand-and-contract: add new column, sync data, migrate callers, drop old |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are indexes defined for all foreign keys, joins, and filtered query clauses?
✅ Are transactions wrapped atomically with rollbacks on failure?
✅ Are migration scripts backwards-compatible (expand-and-contract pattern)?
✅ Did I verify column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
