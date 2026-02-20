---
description: Display agent and project status. Progress tracking and status board.
---

# /status — Session View

$ARGUMENTS

---

This command shows the current state of the active Tribunal session — what has run, what passed, what was rejected, and what is waiting at the Human Gate.

---

## Session Dashboard

```
━━━ Tribunal Session ━━━━━━━━━━━━━━━━━━━━

Mode:     [Generate | Review | Plan | Audit]
Request:  [original prompt or task name]

━━━ Agent Activity ━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer          ✅ APPROVED
  security-auditor        ❌ REJECTED — 1 issue
  dependency-reviewer     ✅ APPROVED
  type-safety-reviewer    🔄 Running
  performance-reviewer    ⏸️  Queued

━━━ Blocked Issues ━━━━━━━━━━━━━━━━━━━━━

❌ security-auditor flagged:
   File: src/routes/user.ts — Line 34
   Type: SQL injection
   Fix:  Replace string interpolation with parameterized query

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━

  Status: ⏸️  Awaiting your decision before any file is written.

  Options:
    ✅ Approve  — write the approved changes to disk
    🔄 Revise   — send back to the Maker with feedback
    ❌ Discard  — drop this generation entirely
```

---

## Status Symbols

| Symbol | Meaning |
|---|---|
| ✅ | Agent complete — verdict returned |
| 🔄 | Agent currently running |
| ⏸️ | Queued — waiting for a prior stage |
| ❌ | Rejected — issue found, cannot proceed |
| ⚠️ | Warning — non-blocking, review before approving |

---

## Sub-commands

```
/status              → Full session view
/status issues       → Show only REJECTED and WARNING verdicts
/status gate         → Show what's currently at the Human Gate awaiting approval
/status agents       → Show only the agent activity table
```
