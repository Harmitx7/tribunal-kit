---
name: database-design
description: Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Database Design Principles

> A schema is cheap to design and expensive to migrate.
> Design it right for the queries your app actually runs.

---

## Core Decision: What Database?

Before schema design, the database type must be justified — not assumed.

| Need | Consider |
|---|---|
| Relational data with integrity constraints | PostgreSQL (default choice for most apps) |
| Horizontal write scaling, flexible schema | MongoDB, DynamoDB |
| Sub-millisecond reads, ephemeral/session data | Redis, Upstash |
| Full-text search as primary use case | Elasticsearch, Typesense |
| Serverless, zero-ops, edge-deployable | Turso, PlanetScale, Neon |
| Time-series events | InfluxDB, TimescaleDB |

**Default when uncertain:** PostgreSQL. It handles relational, JSON, full-text, and time-series use cases well enough that you rarely need to deviate for most applications.

---

## Schema Design Rules

### Model for queries, not for elegance

The most normalized schema is not always the right schema. Ask: **what does the application actually read?**

Design the schema to make the most frequent, performance-critical queries fast — even if that means some denormalization.

### Naming Conventions

```sql
-- Tables: plural, snake_case
CREATE TABLE user_sessions (...);

-- Primary keys: always "id"
id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Foreign keys: {referenced_table_singular}_id
user_id UUID REFERENCES users(id);

-- Timestamps: always include both
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Booleans: is_ prefix
is_active BOOLEAN NOT NULL DEFAULT TRUE;
```

### Required on Every Table

```sql
id          UUID PRIMARY KEY    -- or BIGSERIAL for high-insert tables
created_at  TIMESTAMPTZ         -- immutable creation time
updated_at  TIMESTAMPTZ         -- changes on every update (trigger or ORM)
```

---

## Indexing Strategy

An index makes reads faster and writes slightly slower. Index on the columns you filter and sort — not every column.

**Index when:**
- Column appears in `WHERE` clauses frequently
- Column is used for `JOIN` conditions
- Column is used in `ORDER BY` on large result sets
- Column is a foreign key that will be queried by relationship

**Don't index when:**
- Table has under a few thousand rows — full scan is faster than index lookup overhead
- Column has very low cardinality (e.g., a boolean field with 95% TRUE)
- Column is rarely queried

```sql
-- Composite index: order matters — most selective first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index: only index what you query
CREATE INDEX idx_active_users ON users(email) WHERE is_active = TRUE;
```

---

## N+1 Queries

The most common ORM performance failure. N+1 happens when you fetch N records then make a separate query for each one.

```ts
// ❌ N+1 — 1 query for posts + N queries for authors
const posts = await Post.findAll();
for (const post of posts) {
  post.author = await User.findById(post.userId); // N queries
}

// ✅ Eager load — 2 queries total
const posts = await Post.findAll({ include: ['author'] });
```

**Detection:** Enable query logging in development. If you see repetitive queries differing only by ID, you have N+1.

---

## Migration Rules

- Every schema change is a migration — never modify the database directly in production
- Migrations are additive first: add the column, deploy code that uses it, then remove the old column later
- Never drop a column in the same migration that deploys the code removing its references
- Test migrations on a production-size dataset — a 10-second migration on dev can lock a table for hours on prod

---

## File Index

| File | Covers | Load When |
|---|---|---|
| `schema-design.md` | Detailed schema patterns and relationship modeling | Designing or reviewing a schema |
| `indexing.md` | When and how to index, partial indexes, covering indexes | Performance investigation |
| `orm-selection.md` | Prisma vs Drizzle vs TypeORM vs raw SQL trade-offs | Choosing ORM |
| `migrations.md` | Safe migration patterns, rollback strategy | Changing existing schema |
| `optimization.md` | Query analysis, EXPLAIN output, common fixes | Slow query diagnosis |
| `database-selection.md` | Detailed database selection framework | Architecture decision |

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/schema_validator.py` | Validates schema for missing indexes, naming issues | `python scripts/schema_validator.py <project_path>` |
