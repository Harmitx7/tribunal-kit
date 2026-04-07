---
description: Migration workflow for framework upgrades, dependency bumps, and database migrations. Impact analysis first, expand-and-contract for DB, dependency compatibility matrix before upgrading, rollback tested before deploy.
---

# /migrate — Safe Migration Execution

$ARGUMENTS

---

## When to Use /migrate

|Use `/migrate` when...|Use something else when...|
|:---|:---|
|Upgrading Next.js major version|Adding a feature → `/enhance`|
|Upgrading React version|Schema change in existing rows → `/migrate`|
|Database schema structural change|Simple column add → `/enhance`|
|Changing auth libraries (next-auth v4 → v5)|Dependency patches → `/fix`|
|Removing deprecated APIs at scale||

---

## Migration Types

```
Type A: Framework upgrade (Next.js 14 → 15, React 18 → 19)
  → Audit breaking changes, update callsites, run Tribunal
  
Type B: Dependency major version (Prisma 5 → 6, next-auth 4 → 5)
  → Check changelog for removed APIs, update all callsites
  
Type C: Database schema migration (expand-and-contract)
  → Always in 3 phases, never destructive in one step

Type D: Auth system migration
  → Dual-write old + new, staged rollout, never big bang
```

---

## Phase 1 — Impact Analysis

Before any migration:

```bash
# What uses the old API?
grep -r "getServerSideProps\|getStaticProps" src/ --include="*.ts"  # Next.js pages/ to app/
grep -r "getServerSession\|NextAuth" src/ --include="*.ts"          # next-auth v4 to v5
grep -r "from 'next-auth'" src/ --include="*.ts"                    # Count callsites
grep -r "prisma\.user\.findOne" src/ --include="*.ts"               # Removed Prisma APIs

# How many files will change?
# Low risk: < 5 files
# Medium risk: 5-20 files → plan each file explicitly
# High risk: > 20 files → automate with codemods, not manual
```

---

## Phase 2 — Breaking Change Inventory

```
Framework Migration Breaking Changes (Next.js 14 → 15 example):
□ params and searchParams are now Promises — must await
□ cookies(), headers(), draftMode() are async — must await
□ fetch() caching defaults changed (now no-store by default)
□ Turbopack becomes default dev server (may affect custom configs)

Auth Library Breaking Changes (next-auth v4 → v5):
□ import { getServerSession } from 'next-auth' → import { auth } from './auth'
□ Configuration file: pages/api/auth/[...nextauth].ts → auth.ts
□ SessionProvider import path changed
□ Callbacks API may have changed
```

---

## Phase 3 — Database Migrate (Expand-and-Contract Pattern)

**NEVER do destructive schema changes in a single step on live data.**

```
Step 1: EXPAND (add, never remove)
  - Add new column (nullable)
  - Add new table
  - Add new foreign key

Step 2: DUAL-WRITE (write to both old and new)
  - Application writes to BOTH old_column and new_column
  - Deploy this code before backfilling

Step 3: BACKFILL (populate new structure)
  - Fill new_column from old_column in background batches
  - Verify: SELECT COUNT(*) WHERE new_column IS NULL should = 0

Step 4: READ MIGRATION (switch reads to new)
  - Application reads from new_column only
  - Application still writes to both

Step 5: CONTRACT (remove old)
  - Remove writes to old_column
  - After 1 deployment cycle → drop old_column
```

---

## Phase 4 — Migration Execution Order

```
□ Create git branch: git checkout -b migrate/[description]
□ Run tests BEFORE migration: npm test (establish baseline)
□ Apply changes in topological order (foundation files first)
□ Run: npx tsc --noEmit (no type errors introduced)
□ Run: npm test (all tests still pass)
□ Run Tribunal on changed files: /tribunal-full
□ PR review with explicit diff
□ Deploy to staging before production
□ Run tests in staging
□ Human Gate: approve production deployment
```

---

## Phase 5 — Rollback Plan

Before migrating production, document the rollback:

```
Rollback for code migration:
  git revert [migration-commit]
  git push origin main --force-with-lease

Rollback for DB migration:
  Maintain down.sql for every migration
  Test rollback script on staging before production migration
```

---

## Migration Guard

```
❌ Never rename a DB column in a single migration (breaks live app)
❌ Never DROP a column in the same migration that adds the replacement
❌ Never migrate production database and application code simultaneously
❌ Never run a migration without first testing on a restored production backup
❌ Never skip the backward-compatibility window (keep old code during transition)
```

---

## Usage Examples

```
/migrate upgrade Next.js 14 to Next.js 15 App Router
/migrate upgrade from next-auth v4 to v5 auth.js
/migrate add a phoneNumber field to the users table
/migrate remove the deprecated legacy_api_key column from users
/migrate upgrade Prisma 5 to Prisma 6 and update all breaking API calls
```
