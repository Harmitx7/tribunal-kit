---
name: autonomous-execution
description: "Use when executing, coordinating, planning, or reviewing autonomous execution agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "autonomous"
  - "execution"
---

# Autonomous Execution (Bounded Jev-style Loop)

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `autonomous-execution` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing autonomous execution agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `autonomous-execution` domain or is managed by a different dedicated specialist agent.


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


$ARGUMENTS

---

## 1. Scratchpad Memory Rule

You MUST initialize and maintain your state in `task-<N>-scratchpad.md`.
Do not try to remember complex API signatures in your context window. Write them down in the scratchpad.

### Scratchpad Structure:

```markdown
# Scratchpad - Task <N>

## 1. Goal

[Briefly state the goal derived from the task brief]

## 2. Execution Plan

- [ ] Step 1
- [ ] Step 2

## 3. Current Context

- `some_file.js`: Exports `functionA(a, b)`
- API: Requires `Bearer` token

## 4. Attempt Log

- Attempt 1: Failed test `x is undefined`. Fix: Update `y`.
```

Whenever you discover something new or fail a test, UPDATE the scratchpad before taking your next action.

## 2. Dynamic Discovery (No Guessing)

Do NOT assume file structures or API endpoints.

- Use `list_dir` or `grep_search` to find the files you need to modify.
- Use `view_file` to read the exact lines of code you are changing.
- Verify every import against `package.json`.

## 3. The ReAct Loop (Thought -> Action -> Observation)

You are in a continuous loop. Do not stop until the task is complete.

1. **Thought:** "I need to find the SDD controller."
2. **Action:** Call `grep_search` for "SDD controller".
3. **Observation:** See results.
4. **Thought:** "I found it in `sdd.js`. I will read it."
5. **Action:** Call `view_file` on `sdd.js`.

## 4. TDD Self-Correction

1. Write tests.
2. Run tests via `run_command` (e.g., `npm run test` or `cargo test`).
3. If they fail, READ the error output.
4. Document the failure in your scratchpad.
5. Fix the code.
6. Loop until tests pass (GREEN).

## 5. Circuit Breaker

If you fail the same test 3 times, or if you reach 10 total iterations, STOP and report the failure in your final output. Do NOT loop infinitely.

## 6. Zero Commits

You are an implementer. You only modify files. The SDD Controller will generate the `.diff` and commit the files after the Tribunal Wave approves your work. DO NOT run `git commit`.

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
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

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
