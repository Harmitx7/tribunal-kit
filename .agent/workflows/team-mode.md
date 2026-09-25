---
name: team-mode
description: "Enable dynamic multi-agent task execution, DAG routing, and parallel reviews."
version: 1.0.0
---

# TEAM MODE (DAG ORCHESTRATION)

## Invocation
`/team-mode [task_prompt]`

## Behavior
Activates the `swarm_dispatcher.js` using the `--mode dag` flag to execute highly complex, multi-domain tasks.

1. **Decomposition**: The Orchestrator agent splits the `task_prompt` into a Topological DAG.
2. **Delegation**: Specialized agents (e.g., `frontend-specialist`, `database-architect`) are assigned specific nodes in the graph.
3. **Parallel Execution**: Independent tasks execute simultaneously.
4. **Handoffs**: Output from a database task is explicitly passed as context to the dependent frontend task.
5. **Review**: The entire output is passed through `/tribunal-full` before being marked complete.

## Guardrails
Team Mode cannot bypass the Human Gate. If any subagent proposes a destructive action, the entire DAG is paused, and the Human Gate Negotiator is summoned.
