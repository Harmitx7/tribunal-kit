---
description: Interactive session state tracking for multi-conversation context continuity.
---

# /session — Interactive Session State Tracker

Use this workflow to maintain context and track overarching goals across multiple single-chat sessions.

## Commands

```bash
# Start a new session or update current session status
python .agent/scripts/session_manager.py save "working on auth middleware"

# Load the current active session
python .agent/scripts/session_manager.py load

# View the last 10 session checkpoints
python .agent/scripts/session_manager.py show

# Clear the session data entirely to start fresh
python .agent/scripts/session_manager.py clear
```

## How It Works

The interactive session tracker acts as a logbook in `.agent_session.json`. 
When the agent starts a new session (e.g., from an `@mention` or a fresh chat), the agent is instructed to run `load` or `show` to establish situational awareness.
When the user requests to drop a waypoint, the agent runs the `save` command, giving future sessions a starting point.

## Workflow Example

```
User: /session save "Finished implementing JWT strategy. Next session we need to do the user endpoints."
Agent: [Executes save command]
✅ Session saved: Finished implementing JWT strategy...

[A few hours later, entirely new conversation, user opens Windsurf/Cursor]
User: What were we doing again? /session load
Agent: [Executes load command]
Current session:
  Session: #5
  Note:    Finished implementing JWT strategy. Next session we need to do the user endpoints.
```
