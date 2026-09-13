---
name: parallel-agents
description: Use when Parallel processing coordination for multi-agent swarms. Asynchronous dispatches, merging divergent logic streams, race conditions in autonomous agents, avoiding Git conflicts in concurrent generation, and fan-out/fan-in processing patterns. Use when orchestrating multiple agents simultaneously.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - agent-organizer
  - fabel-protocol
  - workflow-optimizer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Parallel Agents — Concurrent Orchestration Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `parallel-agents` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Parallel processing coordination for multi-agent swarms. Asynchronous dispatches, merging divergent logic streams, race conditions in autonomous agents, avoiding Git conflicts in concurrent generation, and fan-out/fan-in processing patterns. Use when orchestrating multiple agents simultaneously.
- **DO NOT activate when:** The task falls outside the `parallel-agents` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


---

## Hallucination Traps (Read First)

- ❌ Assuming parallel agents can write to the same file -> ✅ Use file-level locking or assign each agent a distinct file scope
- ❌ Not implementing fan-in synthesis after fan-out -> ✅ Parallel results must be merged with conflict resolution, not blindly concatenated
- ❌ Running more than five concurrent agents without resource limits -> ✅ Context window and API rate limits scale with agent count

---

---

## 1. Fan-Out / Fan-In Pattern

The foundation of parallel multi-agent architecture.

3. **Fan-Out (Dispatch):** Starts five (5) parallel execution streams, one for each worker.
4. **Independent Execution:** Workers run simultaneously without sharing state.
5. **Fan-In (Synthesis):** Supervisor uses `Promise.allSettled()` to wait for all ten (10) results. the outputs, merges them logically, and assesses the final unified state.

```typescript
// Architectural representation (Fan-out/Fan-in)
async function executeParallelAudit(sourceCode: string) {
  // Fan-Out
  const promises = [
    agentDispatch({ role: 'security-auditor', task: sourceCode }),
    agentDispatch({ role: 'performance-profiling', task: sourceCode }),
    agentDispatch({ role: 'web-accessibility-auditor', task: sourceCode }),
  ];

  // Await concurrent resolution
  // If one takes 10s and another takes 2s, the total wait is max(10s)
  const [securityReport, perfReport, a11yReport] = await Promise.all(promises);

  // Fan-In Synthesization
  return synthesizeReports({ securityReport, perfReport, a11yReport });
}
```

---

## 2. Preventing Workspace Collision Risks

When multiple agents write to disk concurrently, catastrophic race conditions occur.

**The Golden Rules of Parallel Agents:**

1. **Never allow concurrent agents to modify the same file.** Standard Git/File lockers will fail. The last one to save entirely overwrites the changes of the others.
2. **Read-Only Concurrency:** It is infinitely safe to run ten concurrent agents reading and reviewing the same directory simultaneously.
3. **Directory Isolation:** If multiple agents MUST generate code simultaneously, enforce strict boundaries. Add boundary guards instructing Agent A to stay out of the directories Agent B is designated to manipulate.

---

## 3. Reviewer Swarms (The Tribunal Principle)

The Tribunal uses parallel processing exclusively for the review phase to drastically speed up output validation without slowing down the user.

- **The Maker:** Generates code (Sequential, isolated).
- **The Reviewers:** 4x Reviewer Agents analyze the Maker's generated code simultaneously from independent angles (Security, Typing, Logic, Performance).
- **The Gate:** The outputs merge into a synthesis report for human approval.

---

## 4. Handling Differential Failures

What happens when 4 parallel tasks run, and 1 fails?
Does the whole pipeline crash?

```typescript
// ❌ BAD: Promise.all fails instantly if ANY sub-agent crashes or hallucinates
const results = await Promise.all(agentJobs);

// ✅ GOOD: Use Promise.allSettled to ensure resilient aggregation
const results = await Promise.allSettled(agentJobs);

for (const result of results) {
  if (result.status === 'fulfilled') {
    aggregatedOutput.push(result.value);
  } else {
    // 1 agent failed (e.g. rate limit, or runtime crash)
    // The supervisor can retry just this branch, or proceed with partial success
    logger.warn(`Sub-agent sequence failed: ${result.reason}`);
    flagForHumanReview(result.reason);
  }
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

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
