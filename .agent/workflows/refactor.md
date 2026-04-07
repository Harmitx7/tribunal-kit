---
description: Structured code refactoring with dependency-safe execution and behavior preservation. Maps all dependents before touching any file. Refactoring changes structure without changing observable behavior. Tests must pass before and after every step.
---

# /refactor — Dependency-Safe Structural Improvement

$ARGUMENTS

---

## The Refactoring Contract

"Refactoring means changing the structure of code without changing its observable behavior."
If observable behavior changes, it's an enhancement — use `/enhance`.

---

## When to Use /refactor

|Use `/refactor` when...|Use something else when...|
|:---|:---|
|Code structure is hard to understand|Adding new functionality → `/enhance`|
|Repeated logic should be extracted|Fixing a bug → `/debug`|
|Naming is unclear or misleading|Performance improvements → `/tribunal-performance`|
|TypeScript types need tightening|Full rebuild needed → `/create`|
|Dead code needs removal||

---

## Phase 1 — Pre-Refactor Checklist (Non-Negotiable)

Before touching any file:

```
□ Tests exist and pass (npm test passes clean)
□ If no tests exist → write tests FIRST using /test
□ Impact zone mapped (all importers identified)
□ Behavior contract documented (what must remain identical)
□ Rollback plan confirmed (git branch or stash)
```

**If tests don't exist: STOP. Write tests first. Tests are the safety net for refactoring.**

---

## Phase 2 — Impact Zone Mapping

```bash
# Map every file that will need to change
grep -r "from '.*target-module'" src/ --include="*.ts" --include="*.tsx"

# Check for dynamic imports that grep might miss
grep -r "import(" src/ --include="*.ts" --include="*.tsx"

# Check for re-exports
grep -r "export \* from" src/ --include="*.ts"
```

Build the full change list before making any modification:

```
Refactoring: rename getUserById → fetchUserById

Files affected:
- src/lib/users.ts              [RENAME function definition]
- src/app/api/users/[id]/route.ts [UPDATE callers]
- src/app/dashboard/page.tsx    [UPDATE callers]
- src/lib/users.test.ts         [UPDATE test references]
```

---

## Phase 3 — Dependency-Safe Execution Order

Refactoring order must follow the dependency graph:

```
Rule: Always update the definition FIRST, then update callers.
      Never update a caller before the definition is updated.

Dependency order (example: extracting a shared utility):
1. Create src/lib/shared-utility.ts (new definition)
2. Update the original file to import from shared-utility (definition update)
3. Update all other callers to import from shared-utility
4. Run tests — verify all pass
5. Remove old inline code

Database refactoring order:
1. Write migration (expand: add new column)
2. Update ORM schema
3. Update application code to write to new column
4. Backfill existing data
5. Update application code to read from new column
6. Write second migration (contract: remove old column)
```

---

## Phase 4 — Behavior Verification After Each Step

After every file change in the refactoring sequence:

```bash
npx tsc --noEmit   # TypeScript types must remain valid
npm test           # All tests must still pass
```

**If any step causes a type error or test failure → STOP and fix before proceeding.**

Rolling forward with broken tests is not refactoring — it's breaking code.

---

## Phase 5 — Common Safe Refactoring Patterns

### Extract Function
```typescript
// Before: inline logic in handler
app.post('/orders', async (req, res) => {
  const discount = amount > 100 ? amount * 0.9 : amount; // inline
  // ...
});

// After: extracted pure function with tests
const applyDiscount = (amount: number): number => amount > 100 ? amount * 0.9 : amount;
app.post('/orders', async (req, res) => {
  const discount = applyDiscount(amount); // single responsibility
  // ...
});
```

### Remove Dead Code
```bash
# Verify zero callers BEFORE deleting
grep -r "OldFunction\|oldFunction" src/ --include="*.ts" # Must return: 0 results
# Then delete
```

### Tighten Types
```typescript
// Before: any loses all type checking
function process(data: any) { data.unknownProp; } // No error

// After: explicit interface — all callers must provide correct shape
function process(data: { id: string; name: string }) { data.id; } // Typed
```

---

## Refactor Guard

```
❌ Never refactor without tests passing before AND after
❌ Never rename an exported symbol without updating ALL importers
❌ Never remove "dead code" without grepping to confirm zero usages
❌ Never mix refactoring and new feature in the same commit
❌ Never refactor database columns without expand-and-contract migration
❌ Never change function signatures without updating all callers simultaneously
```

---
