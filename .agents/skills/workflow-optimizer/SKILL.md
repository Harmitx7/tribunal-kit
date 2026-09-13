---
name: workflow-optimizer
description: Use when Analyzes agent tool-calling patterns and task execution efficiency to suggest process improvements.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - parallel-agents
  - plan-writing
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/verify_all.js
  - .agent/scripts/checklist.js
  - .agent/scripts/lint_runner.js
---

# Workflow Optimizer Skill

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `workflow-optimizer` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Analyzes agent tool-calling patterns and task execution efficiency to suggest process improvements.
- **DO NOT activate when:** The task falls outside the `workflow-optimizer` domain or is managed by a different dedicated specialist.

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


## When to Activate

- When a task takes significantly more tool calls than expected.
- When the user asks to "optimize workflow", "reduce steps", or "speed up the agent".
- During retrospective analysis of completed multi-step tasks.
- After a complex `/orchestrate` or `/swarm` dispatch to review efficiency.
- When context window pressure is detected (truncated responses, missed context).

## Analysis Framework

### 1. Tool Call Pattern Analysis

Examine a sequence of tool calls and classify each into:

| Pattern                 | Description                                         | Waste Level | Fix                                       |
| ----------------------- | --------------------------------------------------- | ----------- | ----------------------------------------- |
| **Redundant Read**      | File read multiple times without changes            | 🔴 High     | Cache the content; read once              |
| **Blind Search**        | `grep_search` or `find_by_name` when path was known | 🟡 Medium   | Use `view_file` directly                  |
| **Serial Bottleneck**   | Independent calls made sequentially                 | 🔴 High     | Parallelize with concurrent calls         |
| **Ping-Pong Edit**      | Multiple `replace_file_content` on same file        | 🟡 Medium   | Combine into `multi_replace_file_content` |
| **Over-Read**           | `view_file` full file when only one function needed | 🟡 Medium   | Use `view_code_item` or line ranges       |
| **Unnecessary Outline** | `view_file_outline` on a file already fully read    | 🟢 Low      | Skip — content already in context         |
| **Search Then Read**    | `grep_search` → `view_file` → `view_code_item`      | 🟡 Medium   | Skip directly to relevant tool            |
| **Repeated Status**     | Multiple `command_status` calls before completion   | 🟢 Low      | Use `WaitDurationSeconds` parameter       |
| **Task Churn**          | `task_boundary` called every single tool call       | 🟡 Medium   | Update every 3-5 tool calls               |
| **Context Dump**        | Reading entire large files into context             | 🔴 High     | Targeted reads with line ranges           |

### 2. Parallelism Opportunity Detection

Identify tool calls that have no data dependencies and should run simultaneously:

```
🔴 Serial (Wastes Time):
  Step 1: view_file(A.ts)     → waits
  Step 2: view_file(B.ts)     → waits
  Step 3: view_file(C.ts)     → waits

🟢 Parallel (Optimal):
  Step 1: view_file(A.ts) + view_file(B.ts) + view_file(C.ts)  → all at once
```

**Dependency Rules:**

- Reads are always parallelizable with other reads.
- Writes to different files are parallelizable.
- Writes to the same file must be sequential.
- `run_command` results needed by next step → sequential.
- `task_boundary` should batch with the first tool call of the new phase.

### 3. Task Decomposition Review

Evaluate `task.md` and `task_boundary` usage:

| Issue               | Symptom                                                | Fix                                            |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| **Too Granular**    | One `task_boundary` per tool call                      | Group into logical phases (3-8 calls per task) |
| **Too Broad**       | One task for entire request                            | Break into Planning → Execution → Verification |
| **Stale Summary**   | `TaskSummary` repeating same text                      | Accumulate new info each update                |
| **Backward Status** | `TaskStatus` describes what was _done_                 | Must describe what _will happen next_          |
| **Missing Mode**    | Never switches between PLANNING/EXECUTION/VERIFICATION | Use mode transitions to signal phase changes   |

### 4. Context Window Budget Analysis

| Metric              | Target               | Action if Exceeded                     |
| ------------------- | -------------------- | -------------------------------------- |
| Total lines read    | < 500 per task phase | Filter to relevant sections            |
| Files in context    | < 10 simultaneously  | Prioritize; drop stale reads           |
| Search results      | < 20 matches         | Narrow filters (`Includes`, `Pattern`) |
| File reads per file | 1 per phase          | Cache mentally; don't re-read          |
| Artifact updates    | < 5 per task         | Batch updates                          |

### 5. Error Recovery Efficiency

Analyze how errors are handled:

| Pattern                               | Efficiency        | Better Approach                      |
| ------------------------------------- | ----------------- | ------------------------------------ |
| Retry same command identically        | 🔴 Wasted         | Analyze error first, modify approach |
| Read error → re-read entire file      | 🟡 Inefficient    | Read only the relevant section       |
| Tool error → ask user                 | 🟡 Premature      | Try alternative approach first       |
| Build error → fix one issue → rebuild | 🟢 OK if targeted | Batch multiple fixes before rebuild  |

## Optimization Metrics

### Efficiency Score Formula

```
Raw Score = (Optimal Tool Calls / Actual Tool Calls) × 100

Adjusted Score = Raw Score × (1 - Parallelism Penalty)
  where Parallelism Penalty = (Serial Calls That Could Be Parallel / Total Calls) × 0.2

Grade:
  90-100%  →  A  (Excellent — near-optimal)
  75-89%   →  B  (Good — minor opportunities)
  60-74%   →  C  (Fair — several wasted calls)
  40-59%   →  D  (Poor — significant waste)
  < 40%    →  F  (Rework workflow strategy)
```

## Report Format

```
━━━ Workflow Optimization Report ━━━━━━━━━

Task:         [task name]
Tool Calls:   [actual] / [estimated optimal]
Efficiency:   [grade] ([percentage]%)
Parallelism:  [parallel calls] / [parallelizable opportunities]

━━━ Timeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Planning (calls 1-5)
  1. ✅ view_file_outline(A.ts)          } parallel ✅
  2. ✅ view_file_outline(B.ts)          }
  3. 🟡 view_file(A.ts) — full file read when only function needed
  4. ✅ grep_search("handleAuth")
  5. 🔴 view_file(A.ts) — redundant re-read

Phase 2: Execution (calls 6-12)
  6. ✅ task_boundary(EXECUTION)
  7. ✅ replace_file_content(A.ts)
  8. 🔴 replace_file_content(A.ts) — should batch with step 7
  9. ✅ write_to_file(test.ts)
  ...

━━━ Issues Found ━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Critical (wasted >3 calls)
  1. File A.ts read 3 times — Fix: read once, reference from context
  2. 4 serial reads could be 1 parallel batch — Fix: use concurrent calls

🟡 Warning (wasted 1-2 calls)
  1. Two edits to A.ts back-to-back — Fix: use multi_replace_file_content
  2. task_boundary called 8 times for 12 tool calls — Fix: update every 3-5 calls

🟢 Good Patterns Detected
  1. Used view_code_item instead of full file read for functions
  2. Parallelized independent grep_searches

━━━ Recommendations ━━━━━━━━━━━━━━━━━━━━━
  • Save 3 calls by batching file reads
  • Save 2 calls by using multi_replace over sequential replaces
  • Save 1 call by removing redundant re-read
  • Estimated optimal: 9 calls instead of 14 (64% → 100% efficiency)
```

## Quick Win Checklist

Before analyzing, check for these common quick wins:

- [ ] Are multiple `view_file` calls to different files batched in parallel?
- [ ] Is `multi_replace_file_content` used for non-contiguous edits in one file?
- [ ] Is `view_code_item` used instead of `view_file` for individual functions?
- [ ] Are `task_boundary` updates batched with the first tool call of a new phase?
- [ ] Is `command_status` using `WaitDurationSeconds` instead of polling?
- [ ] Are search results filtered with specific `Includes` and `Pattern`?

## Anti-Hallucination Guard

- **Only analyze actual tool call logs** — never invent or assume tool calls that didn't happen.
- **Recommendations must reference real tools** — only suggest tools available in the current environment.
- **Never fabricate efficiency scores** — always calculate from actual vs optimal counts.
- **Acknowledge uncertainty**: "Cannot determine if calls 3-5 had data dependency — may be correctly sequential."

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
