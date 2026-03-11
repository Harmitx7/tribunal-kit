---
description: Auto-fix known issues with lint, formatting, imports, and TypeScript errors. Human approval required before applying.
---

# /fix — Automated Issue Resolution

$ARGUMENTS

---

This command runs auto-fixable checks and applies corrections. **Every fix requires human approval** — nothing is written to disk without explicit confirmation.

---

## When to Use /fix vs Other Commands

| Use `/fix` when... | Use something else when... |
|---|---|
| Lint reports many auto-fixable issues | Logic bugs → `/debug` |
| Formatting is inconsistent after a merge | Security vulnerabilities → `/audit` |
| Dependency upgrade changed import paths | TypeScript type errors → `/generate` or manual fix |
| Quick cleanup before a PR | Full project health check → `/audit` |

---

## What Happens

### Stage 1 — Dry Run (Always First)

Before fixing anything, show what would change:

```bash
# Lint auto-fix dry run (show issues without applying)
// turbo
python .agent/scripts/lint_runner.py . --fix

# Prettier check (show files that would be reformatted)
// turbo
npx prettier --check .

# TypeScript errors (does not auto-fix — reports only)
// turbo
npx tsc --noEmit
```

Present the dry run results to the user before touching anything:

```
📋 Auto-fixable issues found:
  - ESLint: 12 fixable issues across 5 files
  - Prettier: 8 files would be reformatted
  - TypeScript: 3 unused imports (auto-fixable)
  - TypeScript: 2 type errors (require manual fix — see below)

⚠️ Manual fixes required (not auto-fixable):
  - src/auth/jwt.ts line 34: Type 'string | undefined' is not assignable to 'string'
  - src/db/queries.ts line 12: Property 'userId' does not exist

⏸️ Proceed with auto-fix? [Y = apply | N = cancel]
```

> ⏸️ **Human Gate** — never apply fixes without explicit user approval.

---

### Stage 2 — Apply Fixes (After Approval)

Run fixers in this order (order matters — ESLint first prevents Prettier from undoing logic changes):

```bash
# Step 1: ESLint logic fixes
npx eslint . --fix

# Step 2: Prettier formatting
npx prettier --write .

# Step 3: Import sorting (if configured)
npx organize-imports-cli tsconfig.json
```

---

### Stage 3 — Verify After Fix

```bash
# Full lint must be clean after auto-fix
// turbo
python .agent/scripts/lint_runner.py .

# Tests must still pass (fixes should not change behavior)
// turbo
python .agent/scripts/test_runner.py .

# Show git diff of all applied changes
git diff --stat
```

If tests fail after auto-fix → **revert immediately** and report which fix caused the failure.

---

## What This Does NOT Fix

| Issue type | Handled by |
|---|---|
| TypeScript type errors requiring logic changes | Manual fix or `/generate` |
| Logic bugs | `/debug` |
| Security vulnerabilities | `/audit` then `/generate` |
| Test failures | `/debug` then `/test` |
| Architecture issues | `/refactor` |

These are reported but left for human resolution. Auto-fix never attempts these.

---

## Safety Rules

1. **Never auto-fix without showing the diff first**
2. **Never fix and commit in one step** — user reviews the diff before any commit
3. **If a fix changes behavior** (not just formatting): flag it as `⚠️ This fix may change runtime behavior — review manually`
4. **Revert on test failure** — if tests fail after fixing, undo the fix and report which change caused it
5. **Never modify files in `node_modules` or generated output directories**

---

## Cross-Workflow Navigation

| After /fix... | Go to |
|---|---|
| Lint is clean, ready for review | `/review [file]` for logic audit |
| TypeScript errors remain after lint fix | Address manually or use `/generate` for targeted rewrite |
| Pre-deploy cleanup complete | `/audit` for full project health check |

---

## Usage

```
/fix lint errors in this project
/fix formatting across all files
/fix unused imports and variables
/fix all ESLint and Prettier issues before the PR
```
