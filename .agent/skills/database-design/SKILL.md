---
name: database-design
description: Database design mastery. Schema design with normalization, denormalization strategies, indexing, migration pipelines, ORM selection (Prisma/Drizzle/SQLAlchemy/EF Core), connection pooling, soft deletes, audit trails, multi-tenancy, and serverless database patterns. Use when designing schemas, choosing databases, planning migrations, or architecting data layers.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Database Design — Schema & Architecture Mastery

## Hallucination Traps (Read First)
- ❌ `TIMESTAMP` → ✅ Always `TIMESTAMPTZ` (with timezone). `TIMESTAMP` is ambiguous across timezones.
- ❌ UUID v4 as primary key → ✅ UUID v7 (time-ordered) or `BIGINT GENERATED ALWAYS AS IDENTITY`. UUID v4 is random — destroys B-tree index performance on high-insert tables.
- ❌ No index on foreign keys → ✅ PostgreSQL does NOT auto-index FK columns. Cascading deletes cause full table scans without them.
- ❌ Adding `NOT NULL` column directly to a large table → ✅ Locks the entire table. Add as nullable, backfill in batches, then add constraint.
- ❌ Soft delete without a partial index → ✅ Every query must filter `WHERE deleted_at IS NULL`. Add `CREATE INDEX ... WHERE deleted_at IS NULL` or use a view.
- ❌ Serverless functions without a connection pooler → ✅ Each Lambda/Vercel invocation opens a new connection. Use PgBouncer or Supabase Supavisor — without it, you'll hit `max_connections` instantly.

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

| ORM | Best For | Trade-offs |
|-----|----------|------------|
| **Drizzle** | Edge, TypeScript, bundle-size sensitive | Newer, fewer examples |
| **Prisma** | DX, schema management, Prisma Studio | Heavy, NOT edge-compatible |
| **Kysely** | Type-safe SQL builder, full control | Manual migrations |
| **Raw SQL** | Complex queries, performance-critical | Manual type safety |
| **SQLAlchemy 2.0** | Python async ecosystem | Python only |

```typescript
// Drizzle — SQL-like, edge-compatible
const result = await db.select({ id: users.id, name: users.name }).from(users)
  .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
  .orderBy(desc(users.createdAt)).limit(20);

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

| Index Type | Use For |
|------------|---------|
| **B-tree** | General purpose — equality & range queries (default) |
| **Hash** | Equality-only lookups (faster than B-tree for =) |
| **GIN** | JSONB, arrays, full-text (`tsvector`) |
| **GiST** | Geometric, range types |
| **HNSW / IVFFlat** | Vector similarity (pgvector) |

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
