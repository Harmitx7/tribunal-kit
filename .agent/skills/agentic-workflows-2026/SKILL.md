---
name: agentic-workflows-2026
description: Advanced 2026-2027 AI agent loops, ReAct planning, structured tool calling via Zod/Pydantic, streaming generative UI, and human-in-the-loop gates.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/swarm_dispatcher.js
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/context_broker.js
skills:
  - agentic-patterns
  - generative-ui-expert
  - parallel-agents
---

# Agentic Workflows 2026 — Multi-Agent Architecture

## Mandatory Pre-Flight Context Inspection

Before designing autonomous agent loops:
1. Tool Contract Validation → Enforce strict JSON Schema / Zod validation for every tool call
2. Hard Execution Limit → Enforce a maximum iteration cap (max 10 turns) to prevent infinite loops
3. Human-in-the-Loop Gate → Require human approval for destructive operations (file deletion, production deploy, DB writes)

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
      history.push({ role: 'system', content: `Invalid tool call payload: ${parsed.error.message}` });
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

## 🛑 Verification-Before-Completion (VBC) Protocol

- Validate tool arguments before tool execution.
- Log complete agent trace trajectory for auditability.
