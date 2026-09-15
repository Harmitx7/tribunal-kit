---
name: agent-organizer
description: Use when Master Agent orchestration framework. Coordination of sub-agents, workflow definitions, delegation patterns, state management across conversations, memory distillation, and execution loops. Use when assembling multi-agent systems or managing complex agent-to-agent architectures.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - parallel-agents
  - fabel-protocol
  - agentic-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Agent Organizer — Multi-Agent Orchestration Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `agent-organizer` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Master Agent orchestration framework. Coordination of sub-agents, workflow definitions, delegation patterns, state management across conversations, memory distillation, and execution loops. Use when assembling multi-agent systems or managing complex agent-to-agent architectures.
- **DO NOT activate when:** The task falls outside the `agent-organizer` domain or is managed by a different dedicated specialist.

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

---

## Hallucination Traps (Read First)

- ❌ Dispatching sub-agents without a context_summary -> ✅ Always send a trimmed context, never the full conversation
- ❌ Assuming sub-agents share memory -> ✅ Each agent invocation is stateless unless explicitly passed context
- ❌ Running agents sequentially when they are independent -> ✅ Use fan-out/fan-in for parallelizable work

---

---

## 1. The Delegation Sub-Agent Pattern

Agents should defer specific domain problems to specialized sub-agents.

```json
// Define the payload contract the Worker Agent expects
{
  "taskId": "task-auth-migration-01",
  "workerRole": "api-security-auditor",
  "isolatedContext": {
    "filesToScan": ["src/login.ts", "src/middleware.ts"],
    "objective": "Identify unprotected mass assignments"
  },
  "requiredOutputFormat": "json_list"
}
```

### Delegation Rules:

1. **Never pass full histories:** Do not pass the entire conversation history to a worker sub-agent. Extract only the exact files and goal context required. (Context Window Budgeting).
2. **Clear Boundaries:** If the worker is fixing CSS, it must not invent logic for the database.
3. **Structured Handoff:** The parent agent requests JSON from the worker, parses it, and then acts. Let machines talk to machines through syntax, not prose.

---

## 2. Execution Loops (Supervisor Pattern)

A Supervisor decides _who_ works and _when_, but does not execute the work.

```
[User Request: "Add OAuth and secure it"]
       |
[Supervisor Agent analyzing required skills...]
       |
       ├─> [Dispatches: authentication-best-practices]
       |         (Worker builds OAuth implementation)
       |
       ├─> [Dispatches: api-security-auditor]
       |         (Worker reviews implementation against OWASP)
       |
[Supervisor Agent synthesizes findings]
       |
[Action Executed / Git Commit]
```

### Handoff Signals

A worker must return definitive state signals when yielding control:

- `COMPLETE`: Goal achieved. Final diff generated.
- `BLOCKED`: Missing context (e.g., "I need the `.env` schema").
- `ERROR`: Script failed, requires manual Supervisor intervention.

---

## 3. Session State Management (Memory)

Agents lose memory across boundaries. The Organizer must explicitly persist context.

1. **Short-Term Context:** Maintained natively in the active LLM context window.
2. **Task State:** Maintained locally in `task.md`. Workers check-in and check-out checkboxes.
3. **Long-Term Memory:** "Knowledge Items" (KIs). Distilling massive conversations down into a single `learnings.json` file injected on subsequent startups.

```markdown
<!-- task.md (The Global Execution State) -->

# Current Objective: Build Chat Feature

- [x] Initialize websocket connection
- [/] (Worker: frontend-specialist) Build Chat UI component
- [ ] (Worker: realtime-patterns) Implement presence sync
```

---

## 4. The Human-in-the-Loop (Socratic Gate)

Automation without oversight is reckless. The Organizer manages when to pause and query the human.

**Mandatory Gates:**

1. **Approval Gate (Before Execution):** "I have drafted the architecture plan. Do you approve execution?"
2. **Recovery Gate (After 3 Failures):** "The database migration script has failed 3 times. I am halting. How would you like to proceed?"

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

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
