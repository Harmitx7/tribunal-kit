---
name: htop
description: "Inspect active agent execution metrics, task telemetry, and syscall status."
version: 1.0.0
---

# HTOP (SYSCALL MONITOR)

## Invocation
`/htop` or `/syscall-monitor`

## Behavior
Provides a real-time (or checkpointed) readout of the agent harness execution state.

When invoked, the system reads from `session_logger.js` and `harness_manager.js` to report:
1. **Active Syscalls**: Which commands are currently executing in the background.
2. **Token Usage**: Aggregate token consumption for the current session.
3. **Task Status**: Which nodes in the DAG orchestrator are `PENDING`, `RUNNING`, or `DONE`.
4. **Timeouts**: Any tools approaching their 5-minute kill threshold.

## Usage
Use this command when a marathon agent appears to be stuck, to inspect whether it is waiting on a slow `npm install` or if it has entered an infinite loop.
