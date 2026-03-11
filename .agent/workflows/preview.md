---
description: Preview server start, stop, and status check. Local development server management.
---

# /preview — Local Server Control

$ARGUMENTS

---

Start, stop, or check the development server so you can verify generated code before approving it for your codebase. Always verify in a running local environment before approving the Human Gate.

---

## Sub-commands

```
/preview start     → Launch the dev server
/preview stop      → Shut down the running server
/preview status    → Check if server is live and on which URL
/preview restart   → Stop + start in sequence
/preview logs      → Show recent dev server output
```

---

## On Start

```bash
# Step 1: Check if port is already in use (warn if yes — don't kill blindly)
netstat -an | grep :[port]

# Step 2: Read package.json to find the correct dev command
# Check: scripts.dev → scripts.start → scripts.serve (in priority order)

# Step 3: Launch via auto_preview.py wrapper
// turbo
python .agent/scripts/auto_preview.py start

# Step 4: Wait for ready signal (port open or "ready"/"listening" in output)
# Timeout: 30 seconds — report failure if not ready
```

**Output after start:**

```
━━━ Server Started ━━━━━━━━━━━━━━━━━━━━
URL:     http://localhost:[port]
Command: [actual command used]
PID:     [process id]

Run /preview stop to shut down.
```

---

## On Stop

```bash
// turbo
python .agent/scripts/auto_preview.py stop
```

```
Step 1: Locate running process by port or PID file
Step 2: Send graceful shutdown signal (SIGTERM)
Step 3: Wait up to 10 seconds — force kill (SIGKILL) if needed
Step 4: Confirm port is released

━━━ Server Stopped ━━━━━━━━━━━━━━━━━━━━
Port [N] is now free.
```

---

## On Status

```bash
// turbo
python .agent/scripts/auto_preview.py status
```

```
🟢  Running — http://localhost:[port]  (PID [N], uptime: [duration])
🔴  Not running — no active process found on port [N]
```

---

## On Logs

```
/preview logs      → Show last 50 lines of dev server output
/preview logs --error → Show only error lines
```

---

## Common Issues

| Problem | What to check |
|---|---|
| Port already in use | Run `/preview status` — another process may be running |
| Server starts but page is blank | Check for build errors in logs with `/preview logs --error` |
| Server crashes immediately | Check `package.json` for the correct script name |
| Slow start | Normal for Next.js first compile — wait for "ready" message |

---

## Hallucination Guard

- **`package.json` is always read** before assuming the start command — never assume it's `npm run dev`
- **The actual port is checked from config** — never hardcoded to 3000
- **No invented server flags** added to the start command
- If the server fails to start: report the actual error output, not a guessed reason

---

## Cross-Workflow Navigation

| After /preview start... | Do this |
|---|---|
| Verify generated code visually | Open the URL, interact, then approve the Human Gate |
| Something looks wrong visually | `/debug` the rendering issue |
| Server won't start | Check `/preview logs --error` for the actual failure |

---

## Usage

```bash
/preview start
/preview stop
/preview status
/preview restart
/preview logs
```
