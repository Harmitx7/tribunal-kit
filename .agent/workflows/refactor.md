---
description: Structured code refactoring with dependency-safe execution and behavior preservation
---

# /refactor — Safe Code Restructuring

$ARGUMENTS

---

This command structures a refactoring operation to ensure no behavior changes while improving code quality, readability, or architecture.

---

## When to Use This

- Extracting repeated code into shared functions or modules
- Renaming files, functions, or variables for clarity
- Splitting large files into smaller focused modules
- Reorganizing directory structure
- Removing dead code

---

## What Happens

### Stage 1 — Scope the Change

Before editing anything:

```
What specifically needs refactoring? (file, function, module, pattern)
Why does it need refactoring? (readability, duplication, complexity, coupling)
What is the boundary? (which files are in scope, which are explicitly out)
What should NOT change? (external behavior, API contracts, test expectations)
```

### Stage 2 — Map Dependencies

Run the File Dependency Protocol:

```
1. Identify all callers of the code being refactored
2. Identify all imports from the code being refactored
3. List every file that will need updates after the refactor
4. Flag any circular dependencies
```

> ⚠️ If the dependency map reveals more than 10 affected files, pause and ask the user before proceeding.

### Stage 3 — Execute Incrementally

Refactoring is done in small, reviewable steps:

```
Step 1: Create new structure (new files, new functions)
Step 2: Update imports and callers one at a time
Step 3: Remove old code only after all references point to new
Step 4: Run tests after each step
```

Each step goes through Tribunal review before proceeding.

### Stage 4 — Verify Zero Behavior Change

```
Did all existing tests pass without modification?     Y / N
Did the public API / exports remain identical?         Y / N
Did TypeScript / linter checks pass?                   Y / N
```

All three must be Y. If a test needed changes, the refactor may have introduced a behavioral change — investigate before finalizing.

---

## Hallucination Rules

- Never rename an exported symbol without updating ALL callers
- Never delete a file without verifying zero remaining imports
- Never assume a function is unused — search all call sites first
- If unsure whether code is dead: `// VERIFY: appears unused — confirm before removing`

---

## Usage

```
/refactor extract the auth logic from server.ts into a separate module
/refactor rename all instances of getUserData to fetchUserProfile
/refactor split utils.ts into validation.ts, formatting.ts, and helpers.ts
```
