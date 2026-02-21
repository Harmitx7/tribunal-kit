---
description: Migration workflow for framework upgrades, dependency bumps, and database migrations
---

# /migrate — Version & Schema Migration

$ARGUMENTS

---

This command structures any migration operation — upgrading a framework version, bumping major dependencies, or running database migrations — to minimize breakage and ensure rollback capability.

---

## When to Use This

- Upgrading a framework to a new major version (Next.js 14 → 15, React 18 → 19)
- Bumping a dependency with breaking changes
- Running or creating database migrations
- Migrating from one tool/library to another (e.g., Jest → Vitest, REST → tRPC)

---

## What Happens

### Stage 1 — Inventory Breaking Changes

Before touching any code:

```
What is the migration? (from version X to Y, or from tool A to tool B)
What are the documented breaking changes? (read the changelog / migration guide)
What parts of the codebase are affected? (grep for imports, API usage, config references)
Is there a rollback path? (git branch, database backup)
```

> ⚠️ Never start a migration without reading the official migration guide first. If one exists, read it. If not, read the changelog.

### Stage 2 — Plan the Migration Path

Create a sequential checklist ordered by dependency:

```
1. Update configuration files first (package.json, tsconfig, etc.)
2. Update imports and API calls that changed
3. Handle deprecated features
4. Update tests for new behavior
5. Run full test suite
```

Each step is a checkpoint. If a step fails, stop and resolve before continuing.

### Stage 3 — Execute Incrementally

```
For each step in the migration plan:
  1. Make the change
  2. Run affected tests
  3. Verify no regressions
  4. Commit (or checkpoint) before moving to next step
```

**Rules:**
- One breaking change at a time — never batch multiple breaking changes
- If a step requires more than 5 file changes, break it into sub-steps
- Tests run after every checkpoint, not just at the end

### Stage 4 — Verify Complete Migration

```
Do all tests pass?                                    Y / N
Does the build complete without errors?               Y / N
Are there any remaining deprecation warnings?         Y / N
Has the version been updated in package.json?         Y / N
```

---

## Database Migration Specific

When running database migrations:

```
1. Backup the database first (even in dev)
2. Run migration on a test/shadow database first
3. Verify data integrity after migration
4. Document the rollback SQL / command
```

Schema validation can be run with:
```
python .agent/scripts/schema_validator.py .
```

---

## Hallucination Rules

- Never invent migration steps — only use documented migration guides
- Never assume backward compatibility — verify each change
- Flag any undocumented API changes with `// VERIFY: migration guide does not mention this change`
- Do not remove deprecated code until the replacement is verified working

---

## Usage

```
/migrate Next.js 14 to 15
/migrate from Jest to Vitest
/migrate add a new database column with Prisma
/migrate upgrade React Router from v5 to v6
```
