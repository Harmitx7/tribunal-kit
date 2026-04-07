---
description: Preview server start, stop, and status check. Local development server management. Uses auto_preview.py for automated lifecycle control. Shows current URL and hot-reload status.
---

# /preview — Local Development Server

$ARGUMENTS

---

## Commands

```
/preview start    → Start the local dev server
/preview stop     → Stop the local dev server
/preview restart  → Restart the dev server (after config changes)
/preview status   → Show current server status and URL
```

---

## Execution

```bash
# Start
python .agent/scripts/auto_preview.py start

# Stop
python .agent/scripts/auto_preview.py stop

# Restart
python .agent/scripts/auto_preview.py restart

# Status
python .agent/scripts/auto_preview.py status
```

---

## Server Start Output

```
━━━ Dev Server Starting ━━━━━━━━━━━━━━━━━━

Command:   npm run dev
URL:       http://localhost:3000
Status:    ✅ Running

Hot reload: ✅ Enabled
TypeScript: ✅ Type checking active
```

---

## Common Issues

```
Port 3000 in use:
  → Kill: taskkill /F /IM node.exe  (Windows)
  → OR:   lsof -i:3000 && kill -9 [PID]  (Mac/Linux)
  → OR:   Run on different port: PORT=3001 npm run dev

Build error on start:
  → Run: npx tsc --noEmit to see TypeScript errors
  → Fix errors first, then /preview start

Config change not reflected:
  → /preview restart (hot reload doesn't pick up next.config.js changes)
```

---

## When to Use /preview

|Use `/preview` when...||
|:---|:---|
|After code generation to visually verify|Start: `/preview start`|
|Config file was changed|Restart: `/preview restart`|
|Done working for the session|Stop: `/preview stop`|
|Checking if server is active|Status: `/preview status`|
