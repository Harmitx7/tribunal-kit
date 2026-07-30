---
description: Display agent and project status. Shows task.md progress, last audit results, CI status, and recently modified files. Read-only — no changes made.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - bash-linux
  - code-review-checklist
scripts-binding:
  - .agent/scripts/verify_all.js
---

# /status — Project Health Dashboard

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before rendering project status dashboards, you MUST inspect:
1. Active Execution Ledger (`task.md`) → Read current wave progress, finished tasks, and active in-progress item
2. Workspace Git Status (`git status`, `git diff --stat`) → List uncommitted edits and modified files
3. Read-Only Constraint → Ban any file mutations or state updates during status reporting; report status strictly

---

## What /status Shows

```
1. Active task progress (from task.md)
2. Last audit results summary
3. Recent git activity (last 5 commits)
4. File modification timestamps (hot files)
5. Current server status
```

---

## Execution

```bash
# 1. Task progress
cat .gemini/antigravity/brain/*/task.md 2>/dev/null || echo "No active task"

# 2. Recent git activity
git log --oneline -5

# 3. Recently modified source files (last 24 hours)
find src/ -name "*.ts" -o -name "*.tsx" -newer package.json 2>/dev/null | head -10

# 4. Server status (non-blocking)
node .agent/scripts/auto_preview.js status 2>/dev/null

# 5. Quick type check
npx tsc --noEmit 2>&1 | tail -5
```

---

## Status Report Format

```
━━━ Project Status ━━━━━━━━━━━━━━━━━━━━━━━

Project:    [name from package.json]
Branch:     [git branch]
Last commit: [hash] — [message] — [time ago]

━━━ Active Task ━━━━━━━━━━━━━━━━━━━━━━━━━
[task.md content if exists, else: No active task]

━━━ Recent Changes (24h) ━━━━━━━━━━━━━━━━
  [timestamp] src/app/api/auth/login/route.ts
  [timestamp] src/lib/auth.ts
  [timestamp] prisma/schema.prisma

━━━ TypeScript ━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Zero errors | ❌ N errors found

━━━ Dev Server ━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Running at http://localhost:3000 | ⭕ Not running

━━━ Next Steps ━━━━━━━━━━━━━━━━━━━━━━━━━
[any currently incomplete task items from task.md]
```

---

## Usage

```
/status              → Full project status
/status task         → Active task progress only
/status recent       → Recently modified files only
```

---

## After /status — Next Steps

| Outcome             | Next Command                               |
| :------------------ | :----------------------------------------- |
| Task in progress    | → Continue current work or `/session save` |
| Status shows errors | → `/debug` to investigate recent changes   |

---
