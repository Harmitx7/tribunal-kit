---
description: Analyze requested implementation for minimal viable change. Enforces the 7-level Decision Order (NO_CHANGE to CREATE), Change Budget estimation, Minimality Score (0-100), Complexity Flags detection, and repository search.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 6.0.0
last-updated: 2026-07-30
required-skills:
  - clean-code
  - codebase-design
scripts-binding:
  - .agent/scripts/minimal_change_engine.js
  - .agent/scripts/case_law_manager.js
---

# /minimal — Minimal Change Governance Workflow

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before proposing any code change, you MUST evaluate the **10 Core Governance Questions**:
1. Does anything need to change? (`NO_CHANGE`)
2. Does the repository already solve this? (`REUSE`)
3. Does an existing function, component, utility, service, or abstraction solve it? (`REUSE`)
4. Does the language standard library solve it? (`REUSE`)
5. Does the framework or platform solve it? (`REUSE`)
6. Does an existing dependency solve it? (`REUSE`)
7. Is configuration enough? (`CONFIGURE`)
8. Is deletion or simplification better than addition? (`DELETE`)
9. Is the proposed abstraction necessary for the current requirement? (`MODIFY`/`EXTEND`)
10. What is the smallest implementation that satisfies the request? (`MODIFY`/`EXTEND` vs `CREATE`)

---

## Sub-Commands

| Command | Description |
| :--- | :--- |
| `/minimal` | Analyze requested implementation and determine smallest viable change footprint |
| `/minimal-review` | Review proposed change diff for unnecessary complexity and file proliferation |
| `/change-budget` | Display estimated Change Budget (files added/modified, lines, deps, abstractions) |
| `/complexity-audit` | Audit proposal for 14 standardized complexity flags and overengineering patterns |
| `/reuse-check` | Search repository for existing functions, symbols, and utilities before creating code |

---

## Decision Order Hierarchy

Evaluate solutions strictly in this order:
```
NO_CHANGE ➔ REUSE ➔ CONFIGURE ➔ DELETE ➔ MODIFY ➔ EXTEND ➔ CREATE
```

---

## Output Schema

```
━━━ Minimal Change Governance Audit ━━━━━━━━━━━━━━━━━━━━━━

Minimality Score:          88/100 (PASSED)
Decision Classification:   MODIFY
Strictness Mode:           balanced

━━━ Change Budget ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
files_added:               0
files_modified:            2
dependencies_added:        0
new_abstractions:          0
estimated_lines_added:     14
estimated_lines_removed:    4

━━━ Complexity Flags ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ None detected

━━━ Reuse Opportunities ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Extend src/utils/http.ts for retry policy rather than creating a new service file

━━━ Recommendation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proceed with MODIFY strategy on src/utils/http.ts
```

---

## Usage Examples

```
/minimal add request retry handling to API calls
/minimal-review src/services/retryQueue.ts
/change-budget
/complexity-audit
/reuse-check fetchRetry
```
