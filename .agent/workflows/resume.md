---
name: resume
description: "Resume a recoverable Tribunal Kit session from the durable event log."
version: 1.0.0
---

# RESUME WORKFLOW

## Invocation
`/resume [session_id]`

## Behavior
Tribunal Kit now uses a durable JSONL event log via `session_logger.js`. If a process is killed (OOM, timeout, user interrupt), the state is not lost.

1. **Validation**: Locates the session events in `.agent_session.json`.
2. **Rehydration**: Replays deterministic pure functions to reconstruct the last known valid state.
3. **Resumption**: Skips over completed tasks and automatically restarts the task that was interrupted, pulling in the precise context needed for that specific wave.

## Safety Boundaries
The `/resume` workflow will NEVER blindly replay non-idempotent side effects (e.g., executing a POST request or DROP TABLE) without Human Gate confirmation. 
