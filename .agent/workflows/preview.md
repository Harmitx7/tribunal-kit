---
description: Preview server start, stop, and status check. Local development server management.
---

# /preview — Local Server Control

$ARGUMENTS

---

Start, stop, or check the development server so you can verify generated code before approving it for your codebase.

---

## Sub-commands

```
/preview start     → Launch the dev server
/preview stop      → Shut down the running server
/preview status    → Check if server is live and on which URL
/preview restart   → Stop + start in sequence
```

---

## On Start

```
Step 1:  Check if a process is already using the target port (warn if yes)
Step 2:  Read package.json → scripts.dev or scripts.start to find the actual command
Step 3:  Launch the server
Step 4:  Wait for the ready signal (port open or "ready" in output)
Step 5:  Report back

━━━ Server Started ━━━━━━━━━━━━━━━
URL:     http://localhost:[port]
Command: [actual command used]

Run /preview stop to shut down.
```

---

## On Stop

```
Step 1: Locate the running process by port or PID
Step 2: Send graceful shutdown
Step 3: Confirm port is released

━━━ Server Stopped ━━━━━━━━━━━━━━━
Port [N] is now free.
```

---

## On Status

```
🟢  Running — http://localhost:[port]  (PID [N])
🔴  Not running — no active process found on this port
```

---

## Hallucination Guard

- `package.json` is always read before assuming the start command — never assume it's `npm run dev`
- The actual port is checked from the config — never hardcoded to 3000
- No invented server flags added to the start command

---

## Usage

```
/preview start
/preview stop
/preview status
/preview restart
```
