---
name: agentic-workflows-2026
description: "Use when Advanced 2026-2027 AI agent loops, ReAct planning, structured tool calling via Zod/Pydantic, streaming generative UI, and human-in-the-loop gates."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - agentic-patterns
  - generative-ui-expert
  - parallel-agents
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/context_broker.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Agentic Workflows 2026 — Multi-Agent Architecture

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Agentic Architecture Invariants

1. **Context Window Token Budget**:
   Truncate or summarize completed worker waves before fanning into the supervisor agent. Never pass raw multi-megabyte tool outputs across subagents.
2. **Deterministic Fan-In**:
   Always aggregate worker results using `Promise.allSettled()` to prevent one failing subagent from crashing the entire swarm orchestration.
3. **Structured Failure Handoff**:
   If an agent fails 3 consecutive iterations, halt execution and yield an explicit diagnosis payload to the user rather than spinning in an infinite retry loop.

---

## Core ReAct Loop Pattern (Zod + TypeScript)

```typescript
import { z } from 'zod';

export const ToolCallSchema = z.object({
  toolName: z.enum(['read_file', 'write_file', 'run_test']),
  args: z.record(z.unknown()),
  reasoning: z.string().min(10),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export async function runAgentLoop(task: string, maxTurns = 10) {
  let turn = 0;
  const history: Array<{ role: string; content: string }> = [{ role: 'user', content: task }];

  while (turn < maxTurns) {
    turn++;
    const response = await callLLM(history);
    const parsed = ToolCallSchema.safeParse(response);

    if (!parsed.success) {
      history.push({
        role: 'system',
        content: `Invalid tool call payload: ${parsed.error.message}`,
      });
      continue;
    }

    if (parsed.data.toolName === 'write_file') {
      const approved = await requestHumanApproval(parsed.data);
      if (!approved) break;
    }

    const result = await executeTool(parsed.data);
    history.push({ role: 'tool', content: JSON.stringify(result) });
  }
}
```

## Parallel Fan-Out / Fan-In Execution Matrix

```
[Supervisor Agent]
       ├── Dispatch Worker A (Backend)  ──> WorkerResult A ──┐
       ├── Dispatch Worker B (Database) ──> WorkerResult B ──┼─> [Promise.allSettled Synthesis]
       └── Dispatch Worker C (Frontend) ──> WorkerResult C ──┘
```


## 4. Checkpointing and State Persistence (LangGraph-style)

Shift focus away from clever prompt-engineering tricks and towards structured, graph-based agent topologies (e.g., LangGraph state machines) that support deterministic pausing and resuming.
- **Durable Event Sourcing**: Every tool call, generated payload, and Human Gate decision must be checkpointed to the Durable Session Log.
- **Graph-based Topologies**: Organize sub-agents into a Directed Acyclic Graph (DAG) where nodes represent agent execution states and edges represent data flow. 
- **Resume Capability**: If the LLM context limit is hit or an error occurs, the orchestrator should be able to `/resume` perfectly by replaying the serialized graph state from the session log.
