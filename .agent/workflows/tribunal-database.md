---
description: Database-specific Tribunal. Runs Logic + Security + SQL reviewers. Use for Prisma queries, raw SQL, schema migrations, ORM operations, and database transaction code.
---

# /tribunal-database — Database Code Audit

$ARGUMENTS

---

## When to Use /tribunal-database

| Use `/tribunal-database` when... | Use something else when... |
|:---|:---|
| Prisma queries and schema | Frontend queries → `/tribunal-frontend` |
| Raw SQL with pg/mysql2/better-sqlite3 | API routes calling DB → `/tribunal-backend` |
| Database migrations | Full audit → `/tribunal-full` |
| ORM schema changes | |
| Transaction boundaries | |

---

## 3 Active Reviewers (All Run Simultaneously)

### logic-reviewer
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

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: fix before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items
If all reviewers → ✅ APPROVED: Human Gate
```

---

## Output Format

```
━━━ Tribunal Database ━━━━━━━━━━━━━━━━━━━━

logic-reviewer:   ✅ APPROVED
security-auditor: ❌ REJECTED
sql-reviewer:     ⚠️ WARNING

━━━ VERDICT: ❌ REJECTED ━━━━━━━━━━━━━━━━━

Blockers:
- security-auditor: [CRITICAL] SQL injection via $queryRaw at src/lib/db.ts:34
  Code: await prisma.$queryRaw`SELECT * WHERE email = '${email}'`
  Fix:  await prisma.$queryRaw`SELECT * WHERE email = ${email}` (Prisma auto-parameterizes)

Warnings:
- sql-reviewer: [MEDIUM] N+1 detected — posts fetched inside user loop at src/lib/feed.ts:56
  Fix: Use include: { posts: true } in findMany() instead of for-loop fetches
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
