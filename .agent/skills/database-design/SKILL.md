---
name: database-design
description: Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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
| Semantic / vector similarity search | pgvector (in PostgreSQL), Qdrant, Pinecone |

**Default when uncertain:** PostgreSQL. It handles relational, JSON, full-text, and time-series use cases well enough that you rarely need to deviate for most applications.

---

## Vector Database Patterns

AI applications need semantic search — finding documents by meaning, not keyword. Vector databases store high-dimensional embeddings and search them by similarity.

### pgvector — Stay in PostgreSQL

```sql
-- Enable extension once
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing table
ALTER TABLE documents ADD COLUMN embedding vector(1536);  -- 1536 for text-embedding-3-small

-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- lists = sqrt(num_rows) is a good starting point

-- Query: find 5 most semantically similar documents
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1  -- cosine distance operator
LIMIT 5;
```

### Dedicated Vector DB: When pgvector Isn't Enough

| Trigger to Upgrade | Recommended |
|---|---|
| > 1M vectors + sub-10ms p99 | Qdrant (self-hosted, Rust) or Pinecone (managed) |
| Multimodal (text + images) | Weaviate |
| Managed, predictable pricing | Pinecone |
| Zero-ops prototype | ChromaDB (local) |

### Chunking + Storage Best Practice

```ts
// Always store both the raw text AND the embedding — embeddings are not reversible
await db.query(`
  INSERT INTO documents (content, source_url, chunk_index, embedding)
  VALUES ($1, $2, $3, $4)
`, [chunkText, sourceUrl, chunkIndex, JSON.stringify(embedding)]);
// embedding is float[] — serialize to JSON for parameterized query
```

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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Database Design Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-database`**
**Active reviewers: `logic` · `security` · `sql`**

### ❌ Forbidden AI Tropes in Database Design

1. **Blindly guessing column types** — e.g., using `VARCHAR(255)` for everything instead of precise types or `TEXT`.
2. **Missing `updated_at` triggers** — defining `updated_at` without a mechanism to actually update it.
3. **N+1 queries by default** — returning code that queries relations in a loop.
4. **Destructive migrations** — dropping a column in the same migration that drops the code using it.
5. **Over-indexing** — adding indexes to every single column regardless of cardinality or query patterns.

### ✅ Pre-Flight Self-Audit

Review these questions before generating database schemas or queries:
```
✅ Did I design for the queries the application actually runs, rather than theoretical elegance?
✅ Are my suggested indexes selective and actually used in `WHERE` or `JOIN` clauses?
✅ Is this code safe from N+1 query performance problems?
✅ Did I rely on parameterized queries (no string concatenation)?
✅ Did I use the correct primary key strategy (e.g., UUID vs BIGSERIAL) for the scale?
```


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
