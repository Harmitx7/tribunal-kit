---
name: database-design
description: Database design mastery. Schema design with normalization, denormalization strategies, indexing, migration pipelines, ORM selection (Prisma/Drizzle/SQLAlchemy/EF Core), connection pooling, soft deletes, audit trails, multi-tenancy, and serverless database patterns. Use when designing schemas, choosing databases, planning migrations, or architecting data layers.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Database Design — Schema & Architecture Mastery

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

---

---

## Database Selection (2025)

Choose database based on context, not default.

### Decision Tree

```
What are your requirements?
│
├── Full relational features needed
│   ├── Self-hosted → PostgreSQL
│   └── Serverless → Neon, Supabase
│
├── Edge deployment / Ultra-low latency
│   └── Turso (edge SQLite)
│
├── AI / Vector search
│   └── PostgreSQL + pgvector
│
├── Simple / Embedded / Local
│   └── SQLite
│
└── Global distribution
    └── PlanetScale, CockroachDB, Turso
```

### Comparison

|Database|Best For|Trade-offs|
|----------|----------|------------|
|**PostgreSQL**|Full features, complex queries|Needs hosting|
|**Neon**|Serverless PG, branching|PG complexity|
|**Turso**|Edge, low latency|SQLite limitations|
|**SQLite**|Simple, embedded, local|Single-writer|
|**PlanetScale**|MySQL, global scale|No foreign keys|

### Questions to Ask

1. What's the deployment environment?
2. How complex are the queries?
3. Is edge/serverless important?
4. Vector search needed?
5. Global distribution required?

---

## Indexing Principles

When and how to create indexes effectively.

### When to Create Indexes

```
Index these:
├── Columns in WHERE clauses
├── Columns in JOIN conditions
├── Columns in ORDER BY
├── Foreign key columns
└── Unique constraints

Don't over-index:
├── Write-heavy tables (slower inserts)
├── Low-cardinality columns
├── Columns rarely queried
```

### Index Type Selection

|Type|Use For|
|------|---------|
|**B-tree**|General purpose, equality & range|
|**Hash**|Equality only, faster|
|**GIN**|JSONB, arrays, full-text|
|**GiST**|Geometric, range types|
|**HNSW/IVFFlat**|Vector similarity (pgvector)|

### Composite Index Principles

```
Order matters for composite indexes:
├── Equality columns first
├── Range columns last
├── Most selective first
└── Match query pattern
```

---

## Migration Principles

Safe migration strategy for zero-downtime changes.

### Safe Migration Strategy

```
For zero-downtime changes:
│
├── Adding column
│   └── Add as nullable → backfill → add NOT NULL
│
├── Removing column
│   └── Stop using → deploy → remove column
│
├── Adding index
│   └── CREATE INDEX CONCURRENTLY (non-blocking)
│
└── Renaming column
    └── Add new → migrate data → deploy → drop old
```

### Migration Philosophy

- Never make breaking changes in one step
- Test migrations on data copy first
- Have rollback plan
- Run in transaction when possible

### Serverless Databases

#### Neon (Serverless PostgreSQL)

|Feature|Benefit|
|---------|---------|
|Scale to zero|Cost savings|
|Instant branching|Dev/preview|
|Full PostgreSQL|Compatibility|
|Autoscaling|Traffic handling|

#### Turso (Edge SQLite)

|Feature|Benefit|
|---------|---------|
|Edge locations|Ultra-low latency|
|SQLite compatible|Simple|
|Generous free tier|Cost|
|Global distribution|Performance|

---

## Query Optimization

N+1 problem, EXPLAIN ANALYZE, optimization priorities.

### N+1 Problem

```
What is N+1?
├── 1 query to get parent records
├── N queries to get related records
└── Very slow!

Solutions:
├── JOIN → Single query with all data
├── Eager loading → ORM handles JOIN
├── DataLoader → Batch and cache (GraphQL)
└── Subquery → Fetch related in one query
```

### Query Analysis Mindset

```
Before optimizing:
├── EXPLAIN ANALYZE the query
├── Look for Seq Scan (full table scan)
├── Check actual vs estimated rows
└── Identify missing indexes
```

### Optimization Priorities

1. **Add missing indexes** (most common issue)
2. **Select only needed columns** (not SELECT *)
3. **Use proper JOINs** (avoid subqueries when possible)
4. **Limit early** (pagination at database level)
5. **Cache** (when appropriate)

---

## ORM Selection (2025)

Choose ORM based on deployment and DX needs.

### Decision Tree

```
What's the context?
│
├── Edge deployment / Bundle size matters
│   └── Drizzle (smallest, SQL-like)
│
├── Best DX / Schema-first
│   └── Prisma (migrations, studio)
│
├── Maximum control
│   └── Raw SQL with query builder
│
└── Python ecosystem
    └── SQLAlchemy 2.0 (async support)
```

### Comparison

|ORM|Best For|Trade-offs|
|-----|----------|------------|
|**Drizzle**|Edge, TypeScript|Newer, less examples|
|**Prisma**|DX, schema management|Heavier, not edge-ready|
|**Kysely**|Type-safe SQL builder|Manual migrations|
|**Raw SQL**|Complex queries, control|Manual type safety|

---

## Schema Design Principles

Normalization, primary keys, timestamps, relationships.

### Normalization Decision

```
When to normalize (separate tables):
├── Data is repeated across rows
├── Updates would need multiple changes
├── Relationships are clear
└── Query patterns benefit

When to denormalize (embed/duplicate):
├── Read performance critical
├── Data rarely changes
├── Always fetched together
└── Simpler queries needed
```

### Primary Key Selection

|Type|Use When|
|------|----------|
|**UUID**|Distributed systems, security|
|**ULID**|UUID + sortable by time|
|**Auto-increment**|Simple apps, single database|
|**Natural key**|Rarely (business meaning)|

### Timestamp Strategy

```
For every table:
├── created_at → When created
├── updated_at → Last modified
└── deleted_at → Soft delete (if needed)

Use TIMESTAMPTZ (with timezone) not TIMESTAMP
```

### Relationship Types

|Type|When|Implementation|
|------|------|----------------|
|**One-to-One**|Extension data|Separate table with FK|
|**One-to-Many**|Parent-children|FK on child table|
|**Many-to-Many**|Both sides have many|Junction table|

### Foreign Key ON DELETE

```
├── CASCADE → Delete children with parent
├── SET NULL → Children become orphans
├── RESTRICT → Prevent delete if children exist
└── SET DEFAULT → Children get default value
```
