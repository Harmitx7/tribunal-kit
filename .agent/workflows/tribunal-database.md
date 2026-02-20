---
description: Database-specific Tribunal. Runs Logic + Security + SQL reviewers. Use for queries, migrations, and ORM code.
---

# /tribunal-database — Data Layer Audit

$ARGUMENTS

---

Focused audit for SQL queries, ORM code, schema changes, and migrations. Provide your schema alongside the code for the most accurate analysis.

---

## Active Reviewers

```
logic-reviewer      → ORM methods that don't exist, impossible WHERE conditions
security-auditor    → Injection surfaces, sensitive data exposed without masking
sql-reviewer        → String interpolation in queries, N+1 patterns,
                      references to tables/columns not in the schema
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

Without the schema, the reviewer flags all table/column references as `[VERIFY — schema not provided]`.

---

## What Gets Flagged

| Reviewer | Common Database Catches |
|---|---|
| logic | `prisma.user.findFirstOrCreate()` — not a real Prisma method |
| security | `db.query(\`SELECT * WHERE id = ${req.params.id}\`)` — injection |
| sql | `SELECT * FROM payments` when `payments` table not in schema |
| sql | A loop with a `SELECT` inside — N+1 query pattern |

---

## Report Format

```
━━━ Database Audit ━━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer:    ✅ APPROVED
  security-auditor:  ❌ REJECTED
  sql-reviewer:      ❌ REJECTED

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ❌ Critical — Line 6
     SQL injection: string interpolation in query
     Fix: Use $1 parameterized placeholder

sql-reviewer:
  ❌ High — Line 19
     N+1 detected: SELECT inside for-loop
     Fix: Batch with WHERE id = ANY($1) or use JOIN

━━━ Verdict: NEEDS FIXES ━━━━━━━━━━━━━━━━
```

---

## Usage

```
/tribunal-database [paste query with schema]
/tribunal-database src/repositories/userRepo.ts
/tribunal-database [paste Prisma query]
```
