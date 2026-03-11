---
description: Interactive session state tracking for multi-conversation context continuity.
---

# /session — Interactive Session State Tracker

Use this workflow to maintain context and track overarching goals across multiple single-chat sessions. It acts as a logbook that survives conversation resets.

---

## When to Use This

- Starting a long multi-session task (spanning multiple conversations)
- Resuming work after a break — load the last checkpoint instantly
- Tracking parallel workstreams (tag different sessions)
- Exporting a summary of work for documentation or handoff

---

## Commands

```bash
# ── Core commands ──────────────────────────────────────────────────

# Save a checkpoint of the current session
// turbo
python .agent/scripts/session_manager.py save "working on auth middleware"

# Load the current active session (note + tags)
// turbo
python .agent/scripts/session_manager.py load

# Compact status overview: active session + last 3 checkpoints
// turbo
python .agent/scripts/session_manager.py status

# View the last 10 session checkpoints
// turbo
python .agent/scripts/session_manager.py show

# ── Tagging and filtering ─────────────────────────────────────────

# Add a label/tag to the current session
python .agent/scripts/session_manager.py tag <label>
python .agent/scripts/session_manager.py tag v2-feature

# ── History and export ────────────────────────────────────────────

# Paginated list of ALL sessions (most recent first)
python .agent/scripts/session_manager.py list
python .agent/scripts/session_manager.py list --all   # show entire history

# Export all sessions to session_export.md (or stdout)
python .agent/scripts/session_manager.py export
python .agent/scripts/session_manager.py export --stdout

# Clear the session data entirely to start fresh
python .agent/scripts/session_manager.py clear
```

---

## Command Reference

| Command | Description |
|---|---|
| `save <note>` | Save a new session checkpoint with a note |
| `load` | Display the current active session |
| `status` | Compact 3-session status summary + active session |
| `show` | Show the last 10 sessions |
| `tag <label>` | Add a tag to the current session (e.g., `v2-feature`, `auth-sprint`) |
| `list [--all]` | Paginated full session history |
| `export [--stdout]` | Export all history to `session_export.md` |
| `clear` | Delete the session state file entirely |

---

## How It Works

Session state is stored in `.agent_session.json` in the project root.

**Start of a new conversation:** run `status` immediately to re-establish situational awareness:

```
python .agent/scripts/session_manager.py status
```

**When reaching a natural waypoint** (completed a task, switching context): run `save` with a descriptive note so the next session starts with full context.

**Tags** group related sessions for filtering and export. Use them for features, sprints, or bugfix tracks.

---

## Workflow Patterns

**Starting a session:**
```
User:  /session save "Finished implementing JWT strategy. Next: user endpoints."
Agent: ✅ Session saved: Finished implementing JWT strategy...
       Session: #5, tagged: auth-sprint
```

**Resuming after a break:**
```
User:  /session status
Agent: ━━━ Session Status ━━━━━━━━━━━━━━━━━━━━━━━━
         Total sessions: 5
         Active:         #5 — Finished implementing JWT strategy...

         Last 3 sessions:
           #5  2026-03-03T23:15  [auth-sprint]  Finished JWT strategy...
           #4  2026-03-03T21:00  [auth-sprint]  Completed DB schema for auth...
           #3  2026-03-03T18:30  [auth-sprint]  Set up project structure...
```

**Exporting for handoff or documentation:**
```
User:  /session export
Agent: ✅ Exported 5 sessions to session_export.md
```

---

## Best Practices

| Practice | Why |
|---|---|
| Save at every natural stopping point | Next session starts with accurate context |
| Use descriptive notes with "Next:" | Gives future sessions a clear direction |
| Tag sessions by feature or sprint | Makes export and filtering useful |
| Run `status` at every session start | Reestablishes context without reading the full history |

---

## Cross-Workflow Navigation

| Use /session when... | Then go to... |
|---|---|
| Starting a multi-session task | `/plan` to write the formal plan for the work |
| Resuming work on a feature | Load session, then continue with relevant workflow |
| Work is complete, documenting it | `/changelog` to record what was built |

---

## Usage

```
/session save "Finished JWT middleware. Next: protect API routes."
/session status
/session tag auth-sprint
/session list
/session export
/session load
```
