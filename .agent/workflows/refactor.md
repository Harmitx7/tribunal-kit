---
description: Structured code refactoring with dependency-safe execution and behavior preservation.
---

# /refactor — Safe Code Restructuring

$ARGUMENTS

---

This command structures a refactoring operation to ensure **no behavior changes** while improving code quality, readability, or architecture.

> Refactoring mantra: the tests pass before you start. They all still pass when you're done. If they don't — you changed behavior, not structure.

---

## When to Use /refactor vs Other Commands

| Use `/refactor` when... | Use something else when... |
|---|---|
| Code works but needs structural improvement | Code is broken → `/debug` first |
| Extracting repeated logic into shared modules | Adding new behavior → `/enhance` |
| Renaming for clarity across the codebase | Rewriting from scratch → `/create` |
| Reducing complexity or coupling | Performance is the goal → `/tribunal-performance` |

---

## When to Use This

- Extracting repeated code into shared functions or modules
- Renaming files, functions, or variables for clarity
- Splitting large files into smaller, focused modules
- Reorganizing directory structure
- Removing dead code
- Reducing cyclomatic complexity
- Breaking circular dependencies

---

## What Happens

### Stage 1 — Scope the Change

Before editing anything, document:

```
What specifically needs refactoring? (file, function, module, or pattern)
Why does it need refactoring?        (readability, duplication, complexity, coupling)
What is the boundary?                (which files are in scope, which are out)
What must NOT change?                (external behavior, API contracts, test expectations)
```

> ⚠️ If the refactoring scope is vague ("clean up the codebase"), stop and ask for specifics.

### Stage 2 — Map Dependencies

Run the File Dependency Protocol:

```
1. Identify all callers of the code being refactored
2. Identify all imports from the code being refactored
3. List every file that will need updates after the refactor
4. Flag any circular dependencies
5. Note any dynamic imports or string-based requires
```

> ⚠️ If the dependency map reveals **more than 10 affected files**, pause and confirm scope with the user before proceeding.

### Stage 3 — Execute Incrementally

Refactoring is done in small, reviewable steps:

```
Step 1: Create new structure (new files, new functions) — do NOT delete old yet
Step 2: Update imports and callers one at a time
Step 3: Run tests after each file is updated
Step 4: Remove old code only after ALL references point to the new location
Step 5: Final lint and type check
```

> ⚠️ Never delete old code in the same step as creating new code. The old code serves as a safety net until all callers are updated.

Each step goes through Tribunal review before proceeding to the next.

### Stage 4 — Verify Zero Behavior Change

```
□ All existing tests pass without modification
□ Public API / exports remain identical (same names, same signatures)
□ TypeScript / linter checks pass
□ No new runtime errors in manual smoke test
```

All four must be true. If a test **needed changes** during the refactor, the refactor may have introduced a behavioral change — investigate before finalizing.

---

## Hallucination Guard

- **Never rename an exported symbol** without updating ALL import sites
- **Never delete a file** without verifying zero remaining imports
- **Never assume a function is unused** — search all call sites first
- If unsure whether code is dead: `// VERIFY: appears unused — confirm before removing`
- **Never add new logic** during a refactor — that belongs in `/enhance`
- **Don't "clean up while you're in there"** — scope creep is how refactors break things

---

## Refactor Report Format

```
━━━ Refactor: [what was changed] ━━━━━━━━━━

Scope:
  Files changed: [N]
  Functions changed: [list]
  External behavior change: None (preserved)

Dependency map:
  Callers updated: [list of files]
  Circular deps found: Yes / No

Tribunal result:
  [reviewer]: APPROVED

Zero-behavior verification:
  ✅ All tests pass
  ✅ Exports unchanged
  ✅ TypeScript clean
```

---

## Cross-Workflow Navigation

| After /refactor... | Go to |
|---|---|
| Code was cleaned — now add feature | `/enhance` |
| Tests are missing for refactored area | `/test` to add coverage first |
| Performance improved as side-effect | Verify with `/tribunal-performance` |
| Security concern spotted during refactor | `/review [file]` |

---

## Usage

```
/refactor extract the auth logic from server.ts into a separate module
/refactor rename all instances of getUserData to fetchUserProfile
/refactor split utils.ts into validation.ts, formatting.ts, and helpers.ts
/refactor remove all unused exports from the shared/helpers directory
/refactor break apart the 800-line UserService class into focused services
```
