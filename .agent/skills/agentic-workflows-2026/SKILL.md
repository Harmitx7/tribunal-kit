---
name: agentic-workflows-2026
description: "Use when designing, implementing, auditing, and hardening agentic workflows 2026 server logic, APIs, background jobs, and error boundaries."
version: 6.0.0
last-updated: 2026-09-29
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
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "agentic"
---

# Agentic Workflows 2026 — Multi-Agent Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `agentic-workflows-2026` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when designing, implementing, auditing, and hardening agentic workflows 2026 server logic, APIs, background jobs, and error boundaries.
- **DO NOT activate when:** The task falls outside the `agentic-workflows-2026` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Unchecked Payload Cast** | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query** | Concatenating user inputs into SQL/Prisma query strings | Always use parameterized bindings or type-safe ORM query builders |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication and object-level authorization (IDOR/BOLA) checked before business logic?
✅ Did I verify that imported dependencies exist in package manifests?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
