---
description: Add or update features in existing application. Used for iterative development.
---

# /enhance — Extend What Exists

$ARGUMENTS

---

This command adds to or improves existing code **without breaking what already works**. Enhancement is not greenfield — the existing system shapes what can be done and how.

---

## When to Use /enhance vs Other Commands

| Use `/enhance` when... | Use something else when... |
|---|---|
| Adding to working, existing code | Building from scratch → `/create` |
| Extending a function or module | Restructuring without new behavior → `/refactor` |
| Adding a new endpoint to an existing API | Fixing a broken behavior → `/debug` |
| Upgrading a component's capabilities | Auditing for problems → `/review` |

---

## First Rule: Read, Then Write

> Never modify code you haven't read.
> Never modify a function without checking what calls it.

The first step of every enhancement is a **reading pass** — not a writing pass.

---

## Enhancement Sequence

### Step 1 — Map the Impact Zone

Before touching any file, produce this map:

```
Files to change:      [list — explicit, not "etc."]
Functions affected:   [list — every function being modified]
Callers of those:     [list — these must remain unbroken]
Tests covering them:  [list — these must pass after the change]
Exported symbols:     [list — any public API that must stay compatible]
```

> ⚠️ If the impact zone spans more than 10 files, pause and confirm scope with the user before proceeding.

### Step 2 — Define What Changes vs What Stays

```
Adding:      [new capability being added]
Modifying:   [existing behavior being changed — explain why]
Preserving:  [things that must not change — API contracts, test expectations, response formats]
```

Any change to a **public interface** (function signature, API response shape, exported type) triggers an update of **all callers** — not just the changed file.

### Step 3 — Implement Through Tribunal Gate

| Enhancement Type | Tribunal Gate |
|---|---|
| Backend logic / API change | `/tribunal-backend` |
| Frontend / UI component | `/tribunal-frontend` |
| DB queries or schema | `/tribunal-database` |
| Cross-domain change | `/tribunal-full` |
| Mobile UI component | `/tribunal-mobile` |
| Performance-critical path | `/tribunal-performance` |

The code goes through Tribunal **before** being shown to the user.

### Step 4 — Regression Safety Check

```
□ Existing tests: still pass (none were broken by the change)
□ New tests added: covering the new behavior
□ Callers updated: if any interface changed, all callers are updated together
□ TypeScript / lint: check passes after the enhancement
```

All four must be true before the enhancement is considered complete.

---

## Response Template

```
Enhancement: [What was added or changed, in one sentence]

Impact Zone:
  Changed:         [files modified]
  Callers updated: [files updated, or "none — interface preserved"]

Tribunal result:
  [reviewer]: [APPROVED | REJECTED — reason]

Regression risk:
  🟢 Low    — new path only, no existing path changed
  🟡 Medium — shared code modified, callers reviewed and updated
  🔴 High   — interface changed, all callers updated and verified

Changes:
  [diff or before/after]
```

---

## Hallucination Guard

- **Read existing code before describing it** — never assume what a function does from its name
- **Preserved interfaces must stay identical** — adding a required parameter breaks every caller silently
- **Unknown patterns get `// VERIFY`** — never guess at a codebase convention or framework behavior
- **Never delete or rename an export** without verifying all import sites are updated
- **`// VERIFY: check method exists`** on any method call not seen in existing code or official docs

---

## Cross-Workflow Navigation

| If during /enhance you encounter... | Go to |
|---|---|
| Unexpected behavior in existing code | `/debug` to root-cause before changing anything |
| Code quality so poor it needs restructuring | `/refactor` first, then come back to `/enhance` |
| Security vulnerability in the code you're reading | `/audit` to determine blast radius |
| Tests don't exist for the area being changed | `/test` first to establish a baseline |

---

## Usage

```
/enhance add pagination to the users list API endpoint
/enhance add rate limiting to all authentication routes
/enhance upgrade the search component to support filters
/enhance add retry logic to the payment service's HTTP client
/enhance extend the user model to support multiple email addresses
```
