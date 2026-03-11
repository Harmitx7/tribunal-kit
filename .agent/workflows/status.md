---
description: Display agent and project status. Progress tracking and status board.
---

# /status — Session View

$ARGUMENTS

---

This command shows the current state of the active Tribunal session — what has run, what passed, what was rejected, and what is waiting at the Human Gate.

---

## When to Use This

- After starting a multi-agent task to see which reviewers finished
- When a reviewer rejected code and you want details on the finding
- To check whether anything is currently at the Human Gate awaiting your decision
- To get a snapshot of the session before resuming after a break

---

## Sub-commands

```
/status              → Full session view (default)
/status issues       → Show only REJECTED and WARNING verdicts
/status gate         → Show what's currently at the Human Gate
/status agents       → Show only the agent activity table
/status history      → Show the last 5 completed tribunal sessions
```

---

## Session Dashboard

```
━━━ Tribunal Session ━━━━━━━━━━━━━━━━━━━━

Mode:     [Generate | Review | Plan | Audit | Swarm]
Request:  [original prompt or task name]
Started:  [timestamp]

━━━ Agent Activity ━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer          ✅ APPROVED
  security-auditor        ❌ REJECTED — 1 CRITICAL issue
  dependency-reviewer     ✅ APPROVED
  type-safety-reviewer    ⚠️  WARNING — 1 MEDIUM issue
  performance-reviewer    🔄 Running...
  sql-reviewer            ⏸️  Queued

━━━ Blocked Issues ━━━━━━━━━━━━━━━━━━━━━

❌ security-auditor [CRITICAL] — src/routes/user.ts line 34
   Type: SQL injection via string interpolation
   Code: db.query(`WHERE id = ${id}`)
   Fix:  db.query('WHERE id = $1', [id])

⚠️ type-safety-reviewer [MEDIUM] — src/auth/jwt.ts line 12
   Type: Implicit any in parameter
   Code: function decodeToken(payload) { ... }
   Fix:  function decodeToken(payload: JWTPayload) { ... }

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━

  Status: ⏸️  Awaiting your decision before any file is written.

  Blocked on: security-auditor rejection (CRITICAL)
  Action required: Fix the issue and resubmit, or discard.

  Options:
    ✅ Approve  — write the approved changes to disk
    🔄 Revise   — send back to the Maker with feedback
    ❌ Discard  — drop this generation entirely
```

---

## Status Symbols

| Symbol | Meaning |
|---|---|
| `✅ APPROVED` | Agent complete — no blocking issues |
| `🔄 Running` | Agent currently executing |
| `⏸️ Queued` | Waiting for a prior stage to complete |
| `❌ REJECTED` | Blocking finding — code cannot proceed |
| `⚠️ WARNING` | Non-blocking finding — review before approving |
| `N/A` | Reviewer ran but this domain not present in code |

---

## Retry Counter

The status view also shows how many revision attempts have been made:

```
Maker revision: 2 of 3 (1 remaining before escalation)
```

After 3 revisions without resolving a CRITICAL rejection, the session halts and reports to the user.

---

## Cross-Workflow Navigation

| If /status shows... | Go to |
|---|---|
| CRITICAL security rejection | `/review [file]` for focused audit |
| Multiple rejections across domains | `/tribunal-full` if it hasn't run yet |
| Session stalled at Human Gate | Review findings and decide: approve/revise/discard |
| Everything approved, ready to write | Confirm the Human Gate to write to disk |

---

## Usage

```
/status
/status issues
/status gate
/status agents
/status history
```
