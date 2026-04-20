---
description: Interactive session state tracking for multi-conversation context continuity. Saves and restores agent context across separate sessions so work can be resumed without losing progress.
---

# /session — Session State Management

$ARGUMENTS

---

## Commands

```
/session save      → Save current session state to disk
/session restore   → Restore most recent session
/session status    → Show current session summary
/session new       → Create a new session (archive current)
/session list      → List all saved sessions
```

---

## Execution

```bash
node .agent/scripts/session_manager.js save
node .agent/scripts/session_manager.js restore
node .agent/scripts/session_manager.js status
node .agent/scripts/session_manager.js new
node .agent/scripts/session_manager.js list
```

---

## What Gets Saved

```
Session state includes:
□ Current task.md content
□ Summary of what was completed this session
□ Open questions / blocked items
□ Files modified in this session (from git status)
□ Next planned actions
```

---

## Session File Format

```markdown
# Session: [timestamp]

## Completed This Session
- [task item 1 — completed]
- [task item 2 — completed]

## In Progress
- [task item 3 — started but not finished]

## Blocked
- [item] — blocked by [reason]

## Files Modified
- src/lib/auth.ts
- src/app/api/users/route.ts

## Next Session: Start With
1. [first thing to do in the next session]
2. [second thing]

## Open Questions
- [question 1]
```

---

## When to Use /session

```
End of work session:   /session save → so next session can restore context
Next work session:     /session restore → avoid re-explaining context
Complex multi-day task: /session save between each work block
Context handoff:       /session save → share session file with collaborator
```

---

## Usage Examples

```
/session save   (at end of coding session)
/session restore (at start of next coding session)
/session status (check what was accomplished)
```
