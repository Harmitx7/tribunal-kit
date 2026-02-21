---
description: Auto-fix known issues with lint, formatting, imports, and TypeScript errors. Human approval required before applying.
---

# /fix — Automated Issue Resolution

$ARGUMENTS

---

This command runs auto-fixable checks and applies corrections. Every fix requires human approval — nothing is written to disk without explicit confirmation.

---

## When to Use This

- After a linter reports fixable issues
- After upgrading dependencies that changed import paths
- To clean up formatting across the project
- To sort and organize imports
- To fix simple TypeScript errors (missing types, unused variables)

---

## What Happens

### Stage 1 — Dry Run (Always First)

Before fixing anything, show what would change:

```
# Lint auto-fix (dry run)
python .agent/scripts/lint_runner.py . --fix

# Show what Prettier would change
npx prettier --check .

# TypeScript errors
npx tsc --noEmit
```

Present the dry run results to the user:

```
📋 Auto-fixable issues found:
  - ESLint: 12 fixable issues across 5 files
  - Prettier: 8 files would be reformatted
  - TypeScript: 3 unused imports

Proceed with auto-fix? [y/n]
```

> ⏸️ **Human Gate** — do NOT apply fixes without explicit user approval.

### Stage 2 — Apply Fixes (After Approval)

Run fixers in this order:

```
1. ESLint --fix          (logic fixes first)
2. Prettier --write      (formatting after logic)
3. Import sorting        (if configured)
```

### Stage 3 — Verify After Fix

```
After applying fixes:
  1. Run the full lint check again (should be clean)
  2. Run tests (fixes should not change behavior)
  3. Show the git diff of all changes
```

---

## What This Does NOT Fix

- TypeScript type errors (require manual intervention)
- Logic bugs
- Security vulnerabilities
- Test failures

These are reported but left for human resolution.

---

## Safety Rules

1. **Never auto-fix without showing the diff first**
2. **Never fix and commit in one step** — the user reviews the diff before any commit
3. **If a fix changes behavior** (not just formatting), flag it: `⚠️ This fix may change runtime behavior`
4. **Revert on test failure** — if tests fail after fixing, undo the fix

---

## Usage

```
/fix lint errors in this project
/fix formatting across all files
/fix unused imports and variables
```
