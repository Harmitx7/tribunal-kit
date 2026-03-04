---
description: Interactive session state tracking for multi-conversation context continuity.
---

# /session — Interactive Session State Tracker

Use this workflow to maintain context and track overarching goals across multiple single-chat sessions.

---

## Commands

```bash
# ── Core commands ──────────────────────────────────────────────────

# Start a new session or update current session note
python .agent/scripts/session_manager.py save "working on auth middleware"

# Load the current active session (note + tags)
python .agent/scripts/session_manager.py load

# View the last 10 session checkpoints
python .agent/scripts/session_manager.py show

# Clear the session data entirely to start fresh
python .agent/scripts/session_manager.py clear

# ── New interactive commands ────────────────────────────────────────

# Compact status overview: active session + last 3 checkpoints
python .agent/scripts/session_manager.py status

# Add a label/tag to the current session for filtering and export
python .agent/scripts/session_manager.py tag <label>
# Example:
python .agent/scripts/session_manager.py tag v2-feature

# Paginated list of ALL sessions (most recent first)
python .agent/scripts/session_manager.py list
python .agent/scripts/session_manager.py list --all   # show entire history

# Export all sessions to session_export.md (or stdout)
python .agent/scripts/session_manager.py export
python .agent/scripts/session_manager.py export --stdout
```

---

## Command Reference

| Command | Description |
|---|---|
| `save <note>` | Save a new session checkpoint with a note |
| `load` | Display the current active session |
| `show` | Show the last 10 sessions |
| `clear` | Delete the session state file |
| `status` | **NEW** — Compact 3-session status summary |
| `tag <label>` | **NEW** — Add a tag to the current session |
| `list [--all]` | **NEW** — Paginated full session history |
| `export [--stdout]` | **NEW** — Export all history to `session_export.md` |

---

## How It Works

The interactive session tracker acts as a logbook in `.agent_session.json`.
When the agent starts a new session (e.g., from an `@mention` or a fresh chat), the agent is instructed to run `status` to establish instant situational awareness.
When the user requests to drop a waypoint, the agent runs the `save` command, giving future sessions a starting point.

Tags let you group related sessions (e.g., `v2-feature`, `auth-sprint`, `bugfix`). They appear in `list` output and the exported Markdown file.

---

## Workflow Examples

**Starting a session:**
```
User:  /session save "Finished implementing JWT strategy. Next: user endpoints."
Agent: [Executes save command]
✅ Session saved: Finished implementing JWT strategy...
   Session: #5
```

**Resuming after a break:**
```
User:  What were we doing? /session status
Agent: [Executes status command]
━━━ Session Status ━━━━━━━━━━━━━━━━━━━━━━━━
  Total sessions: 5
  Active:         #5 — Finished implementing JWT strategy...

  Last 3 sessions:
    #5  2026-03-03T23:15
    Finished implementing JWT strategy...
```

**Tagging and exporting:**
```
User:  /session tag auth-sprint
Agent: ✅ Tagged session #5 with 'auth-sprint'.

User:  /session export
Agent: ✅ Exported 5 sessions to session_export.md
```
