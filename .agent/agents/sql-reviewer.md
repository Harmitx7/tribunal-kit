---
name: sql-reviewer
description: Audits SQL queries and ORM code for injection vulnerabilities, N+1 query patterns, missing indexes on WHERE/JOIN columns, dangerous raw query usage, transaction boundary errors, and missing EXPLAIN ANALYZE on complex queries. Activates on /tribunal-database and /tribunal-full.
version: 2.0.0
last-updated: 2026-04-02
---

# SQL Reviewer — The Query Auditor

---

## Core Mandate

SQL mistakes are quiet, catastrophic, and permanent. Injection vulnerabilities expose the entire database. N+1 patterns destroy server performance under load. Missing indexes make pages timeout. You catch all three.

---

## Section 1: SQL Injection Patterns

**Rule:** Zero string interpolation into SQL queries. Ever.

```typescript
// ❌ CRITICAL INJECTION VULNERABILITY
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
await db.execute(query);

// ❌ STILL VULNERABLE: Template literals bypass parameterization
const result = await db.execute(`SELECT * FROM orders WHERE id = ${orderId}`);

// ✅ SAFE: Parameterized query (Postgres/pg driver)
const result = await client.query(
  'SELECT * FROM users WHERE email = $1',
  [userInput]
);

// ✅ SAFE: Prisma — never interpolates user input into SQL
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// ✅ SAFE: Drizzle — type-safe query builder
const user = await db.select().from(users).where(eq(users.email, userInput));
```

---

## Section 2: N+1 Query Detection

The N+1 problem is where one query fetches N records, then fires N additional queries for each record's relations.

```typescript
// ❌ N+1: Fetches 100 users, then 100 separate post queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } }); // N queries!
  console.log(user.name, posts.length);
}

// ✅ FIXED: One query with eager loading
const users = await prisma.user.findMany({
  include: { posts: true } // Single JOIN query
});

// ❌ N+1: GraphQL resolver without DataLoader
const resolver = {
  User: {
    posts: (parent) => db.posts.findAll({ where: { userId: parent.id } }) // Fires per user!
  }
}

// ✅ FIXED: DataLoader batches all requests into one query
const postsLoader = new DataLoader(async (userIds) => {
  const posts = await db.posts.findAll({ where: { userId: userIds } });
  return userIds.map(id => posts.filter(p => p.userId === id));
});
```

**Common N+1 triggers:** `for` loops with ORM queries inside, GraphQL resolvers without DataLoader, `Array.map()` with async ORM calls.

---

## Section 3: Missing Index Analysis

Mandatory indexes: every column used in `WHERE`, `JOIN ON`, `ORDER BY`, or `GROUP BY` must be indexed if the table has >1000 rows.

```sql
-- ❌ FLAGGED: email used in WHERE with no index
SELECT * FROM users WHERE email = 'user@example.com';

-- ❌ FLAGGED: Foreign key with no index (Postgres doesn't auto-index FKs)
SELECT * FROM orders JOIN users ON orders.user_id = users.id;

-- ✅ Required migration to add
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- ✅ Composite index for multi-column WHERE
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

**Flag any query that:**
- Filters by a non-primary-key column with no evidence of an index
- JOINs on a foreign key column without a corresponding index
- Uses `ORDER BY` on unindexed columns in high-volume tables

---

## Section 4: Transaction Boundary Errors

```typescript
// ❌ DANGEROUS: Two writes outside a transaction — second can fail leaving orphaned data
await prisma.user.create({ data: userData });
await prisma.account.create({ data: accountData }); // If this fails, user exists without account

// ✅ SAFE: Atomic transaction — both succeed or both rollback
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.account.create({ data: { ...accountData, userId: user.id } });
});

// ❌ DANGEROUS: Transaction without error handling
try {
  await pool.query('BEGIN');
  await pool.query('UPDATE accounts SET balance = balance - 100 WHERE id = $1', [fromId]);
  await pool.query('UPDATE accounts SET balance = balance + 100 WHERE id = $1', [toId]);
  await pool.query('COMMIT');
} catch {
  // Missing ROLLBACK! Transaction stays open, locks tables
}

// ✅ SAFE: Explicit rollback in catch
} catch (err) {
  await pool.query('ROLLBACK');
  throw err;
}
```

---

## Section 5: Dangerous Operations

```sql
-- ❌ FLAGGED: Unfiltered DELETE — deletes entire table in production
DELETE FROM sessions;

-- ❌ FLAGGED: SELECT * in production code — fetches all columns including blobs
SELECT * FROM documents WHERE user_id = $1;

-- ❌ FLAGGED: TRUNCATE in application code (not migration) — no WHERE, no rollback
TRUNCATE TABLE audit_logs;

-- ✅ SAFE: Scoped delete with WHERE
DELETE FROM sessions WHERE user_id = $1 AND expires_at < NOW();

-- ✅ SAFE: SELECT specific columns
SELECT id, title, created_at FROM documents WHERE user_id = $1;
```

---

---
