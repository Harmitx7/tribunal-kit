---
description: Database-specific Tribunal. Runs Logic + Security + SQL reviewers. Use for queries, migrations, and ORM code.
---

# /tribunal-database — Data Layer Audit

$ARGUMENTS

---

Focused audit for SQL queries, ORM code, schema changes, and migrations. **Provide your schema alongside the code** for the most accurate analysis.

---

## When to Use This vs Other Tribunals

| Code type | Right tribunal |
|---|---|
| SQL queries, ORM, migrations | `/tribunal-database` ← you are here |
| API routes, auth, middleware | `/tribunal-backend` |
| React components, hooks | `/tribunal-frontend` |
| Unknown domain or cross-domain | `/tribunal-full` |

---

## Active Reviewers

```
logic-reviewer      → ORM methods that don't exist, impossible WHERE conditions,
                      chained queries on results that could be null
security-auditor    → SQL injection surfaces, sensitive data exposed without masking,
                      missing authorization checks before DB access
sql-reviewer        → String interpolation in queries, N+1 patterns,
                      references to tables/columns not in the schema,
                      unbounded SELECT *, missing WHERE clauses on DELETE/UPDATE
```

---

## Important: Provide Your Schema

The `sql-reviewer` can only validate column/table names if it has the schema:

```
/tribunal-database

Schema:
  CREATE TABLE users (id UUID, email TEXT, created_at TIMESTAMPTZ);
  CREATE TABLE posts (id UUID, user_id UUID REFERENCES users(id), title TEXT);

Code to audit:
  [paste query or ORM code here]
```

**Without the schema**, the reviewer flags all table/column references as `[VERIFY — schema not provided]`.

---

## What Gets Flagged — Real Examples

| Reviewer | Example Finding | Severity |
|---|---|---|
| logic | `prisma.user.findFirstOrCreate()` — not a real Prisma method | ❌ HIGH |
| security | `` db.query(`SELECT * WHERE id = ${req.params.id}`) `` — injection | ❌ CRITICAL |
| security | `SELECT password FROM users` returned to API without masking | ❌ HIGH |
| sql | `SELECT * FROM payments` when `payments` not in schema | ❌ HIGH |
| sql | `SELECT` query inside a `for` loop — N+1 pattern | ❌ HIGH |
| sql | `DELETE FROM sessions` with no `WHERE` clause | ❌ CRITICAL |
| sql | `SELECT * FROM users` with no pagination — unbounded result | ⚠️ MEDIUM |
| security | No `LIMIT` on a user-controlled query parameter | ⚠️ MEDIUM |

---

## Report Format

```
━━━ Database Audit ━━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer:    ✅ APPROVED
  security-auditor:  ❌ REJECTED
  sql-reviewer:      ❌ REJECTED

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ❌ CRITICAL — Line 6
     SQL injection: string interpolation in query
     Code: db.query(`SELECT * WHERE id = ${req.params.id}`)
     Fix:  db.query('SELECT * WHERE id = $1', [req.params.id])

sql-reviewer:
  ❌ HIGH — Line 19
     N+1 detected: SELECT inside for-loop (10 users = 10 queries)
     Fix:  Batch with WHERE id = ANY($1::uuid[]) or use a JOIN

  ⚠️ MEDIUM — Line 32
     Unbounded result: SELECT * FROM audit_logs — no LIMIT
     Fix:  Add LIMIT + OFFSET or use cursor-based pagination

━━━ Verdict: REJECTED — fix CRITICAL and HIGH before merging ━━━
```

---

## Hallucination Guard

- `sql-reviewer` only references tables and columns **from the provided schema** — no invented schema
- ORM method names are verified against **the installed ORM version's documented API**
- Parameterized query fixes show the **exact parameterized form** for the target database driver
- N+1 fixes must show the **actual batched query**, not just say "use a JOIN"

---

## Cross-Workflow Navigation

| Finding type | Next step |
|---|---|
| SQL injection CRITICAL | Rotate credentials, then fix with `/generate` using parameterization |
| N+1 pattern in ORM | `/enhance` the repository method with proper eager loading |
| Schema references invalid columns | Fix schema first with `/migrate` |
| All approved | Human Gate to write to disk |

---

## Usage

```
/tribunal-database [paste query with schema]
/tribunal-database src/repositories/userRepo.ts
/tribunal-database [paste Prisma query]
/tribunal-database the payment queries in services/billing.ts
```
