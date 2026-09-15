---
name: agentic-workflows-2026
description: Use when Advanced 2026-2027 AI agent loops, ReAct planning, structured tool calling via Zod/Pydantic, streaming generative UI, and human-in-the-loop gates.
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `agentic-workflows-2026` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Advanced 2026-2027 AI agent loops, ReAct planning, structured tool calling via Zod/Pydantic, streaming generative UI, and human-in-the-loop gates.
- **DO NOT activate when:** The task falls outside the `agentic-workflows-2026` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

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

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                | What AI Commonly Does Wrong                                                  | What Is Actually Correct                                                  |
| :-------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Unchecked Payload Cast**  | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing        | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query**   | Concatenating user inputs into SQL/Prisma query strings                      | Always use parameterized bindings or type-safe ORM query builders         |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication checks performed before business logic execution?
✅ Did I verify that imported dependencies exist in package.json/requirements.txt?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
