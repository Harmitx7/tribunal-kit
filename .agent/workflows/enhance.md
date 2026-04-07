---
description: Add or update features in existing applications. Performs impact analysis before any code change — identifies all dependents, detects breaking changes, generates Tribunal-reviewed modifications. No change is written to disk without Human Gate approval.
---

# /enhance — Feature Addition & Modification

$ARGUMENTS

---

## When to Use /enhance

|Use `/enhance` when...|Use something else when...|
|:---|:---|
|Adding a feature to an existing codebase|Starting from scratch → `/create`|
|Changing existing behavior|Fixing a bug → `/debug`|
|Iterating on a recently created feature|Full architecture review → `/plan`|
|Extending an existing API or component|Performance problems → `/tribunal-performance`|

---

## Phase 1 — Impact Analysis (MANDATORY Before Any Change)

Before writing any code, map what will be affected:

```bash
# What does the target file import?
head -30 [target-file]  # Read all imports at the top

# Who imports the target file? (callers)
grep -r "from '.*target-module'" src/ --include="*.ts" --include="*.tsx"

# Who references the specific function/type being changed?
grep -r "targetFunction\|TargetType" src/ --include="*.ts" --include="*.tsx"
```

**Risk Classification:**

|File import count|Risk Level|Required Action|
|:---|:---|:---|
|0–2 importers|Low|Normal Tribunal review|
|3–5 importers|Medium|List all affected files in plan|
|6+ importers|High|Full dependency map + staged rollout|

---

## Phase 2 — Breaking Change Detection

```
Changes that BREAK existing callers:
□ Removing or renaming exported function/type/component
□ Adding required (non-optional) parameter to existing function
□ Changing a parameter type to incompatible type
□ Changing return type to incompatible type
□ Database schema changes (remove column, rename column, change type)
□ API contract changes (removing fields from response)

Changes that DON'T break callers:
□ Adding optional parameter with default value
□ Adding new exported function (existing callers unaffected)
□ Adding nullable column to DB schema
□ Widening return type (e.g., T → T | null)
□ Internal implementation changes with same interface
```

If any breaking changes are detected → document them in the plan before proceeding.

---

## Phase 3 — Enhancement Plan

```markdown
## Enhancement: [Feature Name]

Scope: [what is changing]
Impact zone: [N files affected]
Breaking changes: [Yes: list | None detected]

Changes:
1. [file-a.ts] — [what changes and why]
2. [file-b.ts] — [downstream update required because...]
3. [file-c.test.ts] — [test updates required]
```

**Human Gate:** Plan presented before any editing begins.

---

## Phase 4 — Tribunal-Reviewed Implementation

Each file change goes through the Tribunal pipeline:

```
logic-reviewer:      runs on every change
security-auditor:    runs on every change
[domain-specific]:   activated based on change type
```

**NEVER modify files outside the defined impact zone without approval.**

---

## Phase 5 — Consistency Verification

After all changes:

```
□ npx tsc --noEmit — zero new TypeScript errors
□ npm test — all existing tests still pass
□ New tests written for the new behavior
□ API response contracts verified not to have changed unexpectedly
□ Database migration (if schema changed) runs cleanly
```

---

## Enhancement Guard

```
❌ Never modify files outside the documented impact zone without re-running Impact Analysis
❌ Never add a required parameter without updating all callers
❌ Never rename an exported symbol without grepping all callers first
❌ Never change a DB column without an expand-and-contract migration plan
❌ Never update package versions silently — show in plan
❌ Never "fix other things while we're here" — scope creep
```

---
