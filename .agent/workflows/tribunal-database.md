---
description: Database-specific Tribunal. Runs Logic + Security + SQL reviewers. Use for Prisma queries, raw SQL, schema migrations, ORM operations, and database transaction code.
required-skills: database-design
---

# /tribunal-database — Database Code Audit

$ARGUMENTS

---

## $CONTEXT_REQUIRED

```
Read BEFORE database review:
□ Target query/schema files    → The code being audited
□ prisma/schema.prisma         → The single source of truth for schema
□ Database migration files      → History of schema changes
```

---

## When to Use /tribunal-database

| Use `/tribunal-database` when...      | Use something else when...                  |
| :------------------------------------ | :------------------------------------------ |
| Prisma queries and schema             | Frontend queries → `/tribunal-frontend`     |
| Raw SQL with pg/mysql2/better-sqlite3 | API routes calling DB → `/tribunal-backend` |
| Database migrations                   | Full audit → `/tribunal-full`               |
| ORM schema changes                    |                                             |
| Transaction boundaries                |                                             |

---

## 4 Active Reviewers (All Run Simultaneously)

### precedence-reviewer → Checks local repo Case Law for past rejections

logic-reviewer

- Prisma methods that don't exist (`findOne` was removed — use `findUnique`)
- Transaction that should be `$transaction` but isn't
- Pagination query missing total count (returns wrong metadata)
- `.findMany()` with no `take` limit (unbounded query)

### security-auditor

- SQL injection via `$queryRaw` with template literals and user input
- Row-level security bypass (no WHERE clause on user-scoped query)
- Mass assignment via `prisma.user.update({ data: req.body })` (unrestricted)
- Prisma `$executeRaw` with string interpolation

### sql-reviewer

- N+1 pattern (loop with prisma query inside)
- Foreign key columns without `@@index`
- No index on ORDER BY column for large tables
- Unscoped UPDATE/DELETE without WHERE clause
- Missing rollback in raw SQL catch block
- Expand vs contract migration not followed

### schema-reviewer

- Missing input validation before DB persistence
- Schema out of sync with code validation logic
- Prisma schema lacking proper relational constraints
- Enum types not matching between app and database

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: fix before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items
If all reviewers → ✅ APPROVED: Human Gate
```

---

## Database-Specific Hallucination Traps (Common LLM Mistakes)

```typescript
// ❌ Prisma: findOne was REMOVED — doesn't exist in any version
const user = await prisma.user.findOne({ where: { id } });
// ✅ Correct
const user = await prisma.user.findUnique({ where: { id } });

// ❌ Prisma: upsertMany doesn't exist
await prisma.product.upsertMany({ data: products });         // Doesn't exist
// ✅ Use createMany or transaction with multiple upserts
await prisma.$transaction(products.map(p => prisma.product.upsert({ ... })));

// ❌ Migration fails silently: adding NOT NULL column to populated table
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL; // Error on existing rows
// ✅ Always add nullable first, backfill, then add constraint

// ❌ Missing rollback in raw SQL
try {
  await db.query('BEGIN');
  await db.query('UPDATE ...');
} catch (e) {
  // Missing: await db.query('ROLLBACK');
}
```

---

## Usage Examples

```
/tribunal-database the createOrder function with Stripe idempotency
/tribunal-database the user registration with email uniqueness check
/tribunal-database the migration file adding phoneNumber to users
/tribunal-database the paginated product query with category filter
```

---

## After /tribunal-database — Next Steps

| Outcome                     | Next Command                                       |
| :-------------------------- | :------------------------------------------------- |
| All checks pass             | → Safe to run migrations or deploy                 |
| Reviewers reject with fixes | → Apply fixes, then run `/tribunal-database` again |
| Slow queries identified     | → `/tribunal-speed` for latency profiling          |
| Major schema changes needed | → `/migrate` for safe expand-and-contract          |

---
