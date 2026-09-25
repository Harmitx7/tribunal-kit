---
name: graph-engineering
description: "Use when orchestration planning requires a strict Directed Acyclic Graph (DAG) for managing complex dependencies between tasks."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - subagent-driven-development
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
---

# Graph Engineering (DAG Workflow)

## Context
Standard agent workflows are linear pipelines (Maker -> Reviewer -> Human). But complex tasks (like migrating a database AND updating the frontend) have parallelizable steps with strict choke-points. 

## The DAG Strategy
The `swarm_dispatcher.js` supports `--mode dag` for processing tasks mapped as a Topological Directed Acyclic Graph.

1. **Node Definition**: Every task is a Node.
2. **Edges (Dependencies)**: Tasks explicitly declare their dependencies (`dependsOn: ['task_1']`).
3. **Parallel Execution**: Any nodes with no unresolved dependencies are executed simultaneously (`Promise.allSettled`).
4. **Cascade Failures**: If `task_1` fails, any task dependent on it is marked `SKIPPED`. The DAG continues executing unrelated branches.

## Anti-Patterns
- ❌ **Forcing a DAG**: Do not use DAG orchestration for a simple one-file bug fix. Linear execution is safer and faster.
- ❌ **Circular Dependencies**: The Planner Agent must ensure that Task A does not depend on Task B while Task B depends on Task A. 
