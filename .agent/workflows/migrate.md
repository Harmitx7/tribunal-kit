---
description: Migration workflow for framework upgrades, dependency bumps, and database migrations.
---

# /migrate — Version & Schema Migration

$ARGUMENTS

---

This command structures any migration operation — upgrading framework versions, bumping major dependencies, or running database migrations — to minimize breakage and ensure a clear rollback path.

---

## When to Use /migrate vs Other Commands

| Use `/migrate` when... | Use something else when... |
|---|---|
| Upgrading a framework (Next.js 14 → 15) | Minor patch bumps → update `package.json` directly |
| Bumping dependencies with breaking changes | Bug from a recent upgrade → `/debug` |
| Creating or running database migrations | Adding a feature to existing schema → `/enhance` |
| Switching tools entirely (Jest → Vitest) | Code restructuring only → `/refactor` |

---

## Migration Types

| Type | Examples | Key Risk |
|---|---|---|
| Framework major version | Next.js 14→15, React 18→19 | Removed APIs, new routing conventions |
| Dependency breaking change | Lodash 4→5, Axios 1→2 | Changed method signatures |
| Tool migration | Jest → Vitest, CRA → Vite | Config format, different globals |
| Database migration | Prisma schema change, SQL column add | Data loss, downtime |
| Language version | Python 3.10 → 3.12, Node 18 → 22 | Behavior changes, removed builtins |

---

## What Happens

### Stage 1 — Inventory Breaking Changes

Before touching any code:

```
□ What is the migration? (from X to Y)
□ Is there an official migration guide? (read it before proceeding)
□ What are the documented breaking changes? (read the changelog)
□ Which files in the codebase are affected? (grep for imports, config references)
□ Is there a rollback path? (git branch, database backup, rollback command)
□ Is the migration reversible? (some DB migrations are one-way)
```

> ⚠️ **Never start a migration without reading the official migration guide first.** If none exists, read the changelog and all GitHub "breaking change" issues.

---

### Stage 2 — Plan the Migration Path

Create a sequential checklist ordered by dependency:

```
1. Update configuration files        (package.json, tsconfig, build config)
2. Update runtime code               (imports, renamed APIs, new patterns)
3. Handle deprecated features        (replace deprecated APIs with new equivalents)
4. Update tests for new behavior     (new patterns, changed mocks)
5. Run full test suite               (must pass before declaring done)
6. Update documentation              (README, CHANGELOG)
```

Each step is a **checkpoint**. If a step fails, stop and resolve before continuing.

### Stage 3 — Execute Incrementally

```
For each step in the migration plan:
  1. Make the change
  2. Run affected tests immediately
  3. Verify no regressions
  4. Commit the step (isolated commit)
  5. Move to next step
```

**Rules:**
- **One breaking change at a time** — never batch multiple incompatible changes
- If a step requires more than **5 file changes**, break it into sub-steps
- Tests run **after every step**, not just at the end
- If a step breaks more than 5 tests, stop and reassess scope

### Stage 4 — Verify Complete Migration

```
□ All tests pass
□ Build completes without errors
□ No remaining deprecation warnings
□ Version updated in package.json
□ Rollback path documented
□ Staging environment tested (if applicable)
```

---

## Database Migration Specific

When running database migrations:

```bash
# 1. Backup the database FIRST (even in dev)
pg_dump mydb > backup_before_migration.sql

# 2. Run Prisma schema validation
// turbo
python .agent/scripts/schema_validator.py .

# 3. Test migration on shadow/test database first
npx prisma migrate dev --name [migration-name]

# 4. Verify data integrity after migration
# Run custom verification queries or check row counts

# 5. Document rollback SQL
# What command reverses this migration?
```

**One-way migrations:** If a migration drops data or columns, it may be irreversible. Document this explicitly:

```
⚠️ IRREVERSIBLE: This migration drops column `users.legacy_auth_token`.
   Rollback: Requires restoring from backup — not possible via migrate down.
```

---

## Hallucination Guard

- **Never invent migration steps** — only use documented migration guides and official changelogs
- **Never assume backward compatibility** — verify each changed API against official docs
- Flag undocumented behavior changes: `// VERIFY: migration guide does not mention this change`
- **Do not remove deprecated code** until the replacement is verified working
- **No version guessing** — specify exact versions, not ranges, unless the migration guide specifies

---

## Cross-Workflow Navigation

| After /migrate results show... | Go to |
|---|---|
| Tests broke after migration | `/debug` to find root cause |
| Security issues in a new version's patterns | `/audit` for security-focused review |
| New version uses different patterns everywhere | `/refactor` to bring code in line |
| All tests pass, ready for deploy | `/deploy` following pre-flight checklist |

---

## Usage

```
/migrate Next.js 14 to 15
/migrate from Jest to Vitest
/migrate add a new database column with Prisma
/migrate upgrade React Router from v5 to v6
/migrate Python 3.10 to 3.12
/migrate from REST to tRPC
```
