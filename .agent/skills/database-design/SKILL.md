---
name: database-design
description: Database design mastery. Schema design with normalization, denormalization strategies, indexing, migration pipelines, ORM selection (Prisma/Drizzle/SQLAlchemy/EF Core), connection pooling, soft deletes, audit trails, multi-tenancy, and serverless database patterns. Use when designing schemas, choosing databases, planning migrations, or architecting data layers.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Database Design — Schema & Architecture Mastery

> A schema is a contract. Every column name is an API. Every missing index is a production incident waiting to happen.
> Design for reads first. Normalize until it hurts, then denormalize until it works.

---

## Database Selection Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Which Database Do You Need?                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  What's the primary access pattern?                                 │
│  ├── Relational queries (JOINs, transactions, reports)              │
│  │   ├── High consistency + complex queries → PostgreSQL            │
│  │   ├── Simple CRUD + familiar → MySQL / MariaDB                  │
│  │   └── Embedded / edge / serverless → SQLite / Turso             │
│  │                                                                   │
│  ├── Key-value lookups (cache, sessions, counters)                  │
│  │   ├── In-memory speed → Redis / Valkey                          │
│  │   └── Persistent KV → DynamoDB / Upstash                        │
│  │                                                                   │
│  ├── Document store (flexible schema, nested objects)               │
│  │   └── MongoDB / Firestore                                       │
│  │                                                                   │
│  ├── Full-text search                                               │
│  │   ├── Built-in (good enough) → PostgreSQL tsvector              │
│  │   └── Dedicated search → Elasticsearch / Meilisearch / Typesense│
│  │                                                                   │
│  ├── Time-series (metrics, IoT, logs)                               │
│  │   └── TimescaleDB (PostgreSQL ext) / ClickHouse / InfluxDB      │
│  │                                                                   │
│  ├── Graph (relationships, social networks)                         │
│  │   └── Neo4j / Amazon Neptune                                    │
│  │                                                                   │
│  └── Vector (AI embeddings, semantic search)                        │
│      └── pgvector (PostgreSQL ext) / Pinecone / Weaviate           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Schema Design Patterns

### Naming Conventions

```sql
-- ✅ RULES:
-- Tables: plural, snake_case (users, order_items)
-- Columns: singular, snake_case (first_name, created_at)
-- Primary key: id (BIGINT or UUID)
-- Foreign key: {referenced_table_singular}_id (user_id, order_id)
-- Timestamps: created_at, updated_at (TIMESTAMPTZ, not TIMESTAMP)
-- Booleans: is_{adjective} or has_{noun} (is_active, has_paid)
-- Status/enum columns: status, role, type (not state, kind)

-- ❌ BAD naming:
-- tbl_Users, UserID, DateCreated, active, isdeleted, userId
-- ✅ GOOD naming:
-- users, id, created_at, is_active, is_deleted, user_id

-- ❌ HALLUCINATION TRAP: Always use TIMESTAMPTZ (with timezone), not TIMESTAMP
-- TIMESTAMP without timezone is ambiguous and causes bugs across timezones
```

### Standard Table Template

```sql
CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- OR: id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Core fields
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),

    -- Status fields
    is_active   BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    metadata    JSONB DEFAULT '{}',

    -- Timestamps (ALWAYS include these)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Essential indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users (created_at DESC);
```

### ID Strategy

```sql
-- Option 1: BIGINT auto-increment (recommended for most cases)
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
-- Pros: compact, sortable, fast joins, natural ordering
-- Cons: exposes record count, sequential guessing

-- Option 2: UUID v7 (recommended for distributed systems)
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
-- Pros: globally unique, no coordination needed, safe to expose
-- Cons: larger (16 bytes), slower joins, random order (use UUIDv7 for time-ordering)

-- Option 3: ULID / NanoID (application-generated)
-- Pros: sortable, URL-safe, customizable length
-- Cons: requires application logic, not DB-native

-- ❌ HALLUCINATION TRAP: UUID v4 is randomly ordered — kills index performance
-- ✅ Use UUID v7 (time-ordered) if you need UUIDs
-- UUID v7 has a timestamp prefix → sequential inserts → B-tree friendly
```

### Relationships

```sql
-- One-to-Many: foreign key on the "many" side
CREATE TABLE posts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_author_id ON posts (author_id);

-- Many-to-Many: junction table
CREATE TABLE post_tags (
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag_id ON post_tags (tag_id);

-- ❌ HALLUCINATION TRAP: Every foreign key column MUST have an index
-- Without it, cascading deletes on the parent do a full table scan on the child
-- PostgreSQL does NOT auto-index foreign keys (MySQL InnoDB does)

-- Self-referential (tree/hierarchy)
CREATE TABLE categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    depth       INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
```

---

## Soft Deletes

```sql
-- Soft delete pattern
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index — queries against active records are fast
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;

-- "Delete" = set timestamp
UPDATE users SET deleted_at = now() WHERE id = 42;

-- All queries must filter:
SELECT * FROM users WHERE deleted_at IS NULL;

-- OR: Use a view for convenience
CREATE VIEW active_users AS
    SELECT * FROM users WHERE deleted_at IS NULL;

-- ❌ HALLUCINATION TRAP: Soft deletes add complexity to EVERY query
-- Every SELECT, JOIN, and COUNT must include WHERE deleted_at IS NULL
-- Consider using a view or audit_log table instead when possible
```

---

## Audit Trail

```sql
-- Append-only audit log
CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   BIGINT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    changed_by  BIGINT REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition by month for performance
-- CREATE TABLE audit_log (...) PARTITION BY RANGE (changed_at);

CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log USING brin (changed_at);

-- Auto-audit trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        current_setting('app.current_user_id', true)::bigint
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Multi-Tenancy Patterns

```sql
-- Pattern 1: Shared table with tenant_id (simplest, most common)
CREATE TABLE projects (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_tenant ON projects (tenant_id, created_at DESC);
-- ‼️ Every query MUST include WHERE tenant_id = ? — enforce via RLS

-- Row Level Security (PostgreSQL)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON projects
    USING (tenant_id = current_setting('app.current_tenant_id')::bigint);

-- Pattern 2: Schema per tenant (better isolation)
CREATE SCHEMA tenant_acme;
CREATE TABLE tenant_acme.projects (...);

-- Pattern 3: Database per tenant (maximum isolation, hardest to manage)
-- Only for compliance/regulatory requirements
```

---

## ORM Selection

### Prisma (TypeScript/Node.js)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  posts     Post[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
```

```typescript
// Usage:
const user = await prisma.user.findUnique({
  where: { email: "alice@test.com" },
  include: { posts: { take: 10, orderBy: { createdAt: "desc" } } },
});

// ❌ HALLUCINATION TRAP: Prisma uses its own query engine
// It does NOT support raw SQL joins in the standard query API
// Use prisma.$queryRaw for complex queries Prisma can't express
```

### Drizzle (TypeScript — SQL-First)

```typescript
import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, desc, and } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Query (SQL-like, type-safe)
const result = await db
  .select({ id: users.id, name: users.name })
  .from(users)
  .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
  .orderBy(desc(users.createdAt))
  .limit(20);
```

---

## Migration Best Practices

```
Migration Rules:
1. Every migration must be REVERSIBLE (include down/rollback)
2. Never modify a migration that's been applied to production
3. Use explicit column types — never rely on ORM defaults
4. Add indexes in the SAME migration as the column
5. Large table migrations: add column as NULLABLE first, backfill, then add NOT NULL
6. Test migrations against a COPY of production data size
7. Never DROP a column — first remove all code references, deploy, then drop
```

```sql
-- Safe column addition (zero-downtime deploy)
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Step 2: Backfill (in batches to avoid locking)
UPDATE users SET phone = '' WHERE phone IS NULL AND id BETWEEN 1 AND 10000;
UPDATE users SET phone = '' WHERE phone IS NULL AND id BETWEEN 10001 AND 20000;

-- Step 3: Add constraint (after deploy confirms all code writes phone)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';

-- ❌ HALLUCINATION TRAP: Adding NOT NULL without a default locks the ENTIRE table
-- On large tables this can cause downtime. Always add as nullable first.
```

---

## Connection Pooling

```
Application → Connection Pool → Database

Without pooling: 100 requests = 100 DB connections → DB overwhelmed
With pooling: 100 requests = 10-20 reused connections → DB happy

Common poolers:
- PgBouncer (external, most common for PostgreSQL)
- Prisma Accelerate (managed, for Prisma)
- Supabase Supavisor (managed, for Supabase)
- Application-level (SQLAlchemy pool, Drizzle pool)

Sizing formula:
  max_connections = (num_cpu_cores * 2) + num_disk_spindles
  Typical: 25-50 connections for most applications
  
❌ HALLUCINATION TRAP: Serverless functions need EXTERNAL pooling
   Each Lambda/Vercel invocation opens a new connection
   Without PgBouncer/Supavisor, you hit max_connections instantly
```

---

## Output Format

```
━━━ Database Design Report ━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Database Design
Database:    [PostgreSQL/MySQL/SQLite/etc.]
Scope:       [N tables · N migrations]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [migration success / schema validation]
```

---

## 🤖 LLM-Specific Traps

1. **TIMESTAMP vs TIMESTAMPTZ:** Always use TIMESTAMPTZ (with timezone). TIMESTAMP without timezone is ambiguous.
2. **UUID v4 for Primary Keys:** UUID v4 is randomly ordered — destroys B-tree index performance. Use UUID v7 or BIGINT.
3. **Missing FK Indexes:** PostgreSQL does NOT auto-create indexes on foreign key columns. Always add them manually.
4. **NOT NULL on Large Tables:** Adding NOT NULL to an existing column on a large table locks the entire table. Add as nullable first.
5. **`SELECT *` in Application Code:** Always specify columns. Schema changes + `SELECT *` = broken application.
6. **Shared Mutable State Without RLS:** Multi-tenant tables without Row Level Security = data leaks between tenants.
7. **Hardcoded Connection Strings:** Database URLs must come from environment variables, never code.
8. **Direct Production Writes:** Never run unreviewed SQL against production. Use migrations and review processes.
9. **Ignoring Query Plans:** Design decisions without EXPLAIN ANALYZE evidence are guesses.
10. **Serverless Without Pooling:** Every serverless invocation opens a new connection. Always use an external connection pooler.

---

## 🏛️ Tribunal Integration

**Slash command: `/tribunal-database`**

### ✅ Pre-Flight Self-Audit

```
✅ Did I use TIMESTAMPTZ (not TIMESTAMP)?
✅ Did I add indexes for all foreign keys?
✅ Did I use BIGINT or UUID v7 for primary keys?
✅ Are all table/column names snake_case?
✅ Do all tables have created_at and updated_at?
✅ Is the migration reversible?
✅ Did I use parameterized queries (not string interpolation)?
✅ Is connection pooling configured for serverless?
✅ Is multi-tenant data isolated (RLS or schema)?
✅ Did I run EXPLAIN ANALYZE on critical queries?
```

### 🛑 VBC Protocol

- ❌ **Forbidden:** Declaring a schema "optimized" without migration + EXPLAIN evidence.
- ✅ **Required:** Provide migration success logs or schema validation output.
