---
name: agentic-workflows-2026
description: Advanced 2026-2027 AI agent loops, ReAct planning, structured tool calling via Zod/Pydantic, streaming generative UI, and human-in-the-loop gates.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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

1. Tool Contract Validation → Enforce strict JSON Schema / Zod validation for every tool call emitted by an LLM
2. Hard Execution Turn Limit → Enforce a maximum turn cap (max 10 iterations) to guarantee loop termination
3. Token Window Budgeting → Prune past tool call outputs after 3 turns; never let unbounded tool output fill the context window
4. Human-in-the-Loop Gate → Require explicit human approval for destructive operations (file deletion, production deploy, DB mutations)

## Activation Boundaries

- **Activate when:** Building autonomous agent loops, multi-agent swarms, structured tool calling, ReAct planners, and generative UI streaming.
- **DO NOT activate when:** Writing static deterministic backend APIs or simple stateless single-turn prompts.

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

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
