---
description: Add or update features in existing application. Used for iterative development.
---

# /enhance — Extend What Exists

$ARGUMENTS

---

This command adds to or improves existing code without breaking what already works. Enhancement is not greenfield — the existing system shapes what can be done and how.

---

## First Rule: Read, Then Write

> Never modify code you haven't read.
> Never modify a function without checking what calls it.

The first step of every enhancement is a reading pass — not a writing pass.

---

## Enhancement Sequence

### Step 1 — Map the Impact Zone

```
Files to change:      [list]
Functions affected:   [list]
Callers of those:     [list — these must remain unbroken]
Tests currently covering them: [list]
```

This map must exist before any file is opened for editing.

### Step 2 — Define What Changes vs What Stays

```
Adding:      [new capability being added]
Modifying:   [existing behavior being changed]
Preserving:  [things that must not change]
```

Any change to a public interface (function signature, API response shape, exported type) triggers an update of all callers.

### Step 3 — Implement Through Tribunal Gate

| Enhancement Type | Gate |
|---|---|
| Backend logic | `/tribunal-backend` |
| Frontend/UI | `/tribunal-frontend` |
| DB queries | `/tribunal-database` |
| Cross-domain | `/tribunal-full` |

The code goes through Tribunal before being shown.

### Step 4 — Regression Safety Check

```
Existing tests: ✅ still pass (none were broken)
New tests added: ✅ covering new behavior
Callers updated: ✅ if any interface changed
```

All three must be true before the enhancement is considered complete.

---

## Response Template

```
Enhancement: [What was added/changed]

Impact Zone:
  Changed: [files]
  Callers updated: [files, or "none — interface preserved"]

Tribunal result:
  [reviewer]: [APPROVED | REJECTED — reason]

Regression risk:
  🟢 Low — new path only, no existing path changed
  🟡 Medium — shared code modified, callers reviewed
  🔴 High — interface changed, all callers updated

Changes:
  [diff]
```

---

## Hallucination Guard

- **Read existing code before describing it** — never assume what a function does from its name
- **Preserved interfaces must stay identical** — adding a required parameter breaks every caller silently
- **Unknown patterns get `// VERIFY`** — never guess at a codebase convention

---

## Usage

```
/enhance add pagination to the users list API endpoint
/enhance add rate limiting to all authentication routes
/enhance upgrade the search component to support filters
```
