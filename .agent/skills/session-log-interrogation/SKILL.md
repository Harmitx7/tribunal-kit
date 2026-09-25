---
name: session-log-interrogation
description: "Use when teaching selective access to session history to prevent context window bloat during long-running sessions."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - context-engineering-pro
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/session_logger.js
---

# Session Log Interrogation

## The Context Problem
Long-running agent workflows generate thousands of events (Syscalls, Model turns, Tool Responses). Injecting the full session history into a prompt degrades reasoning, wastes tokens, and eventually hits hard limits.

## The Solution: Selective Interrogation
The agent must filter and request specific event ranges rather than loading the entire file.

## Tactics
1. **Time-Bounded Queries**: Request events only since the last major Checkpoint (e.g., "Give me all events since Wave 2 started").
2. **Error-Focused Scans**: Query specifically for `ToolFailed` or `SessionFailed` events to understand what went wrong, ignoring the happy-path `ToolCompleted` events.
3. **Provenance Validation**: When referencing past actions, cite the exact `eventId`.
4. **Context Budgets**: Never load more than 50 events into context at once. If the query yields more, aggregate them into a summary locally before passing to the model.

## Anti-Patterns
- ❌ Reading the raw `.agent_session.json` line-by-line using `cat`.
- ✅ Using the `session_logger.js` or `harness_manager.js` to fetch structured, filtered logs.
