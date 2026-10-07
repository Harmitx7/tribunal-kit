---
name: session-log-interrogation
description: "Use when searching, extracting, and synthesizing past conversation history and decision records. Prevents context amnesia without polluting current prompt budgets with massive raw transcripts."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/session_manager.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "session"
  - "log"
  - "interrogation"
  - "searching"
---

# Session Log Interrogation — Token-Efficient Multi-Session Memory

## Activation Boundaries
- **Activate when:** Use when searching, extracting, and synthesizing past conversation history and decision records. Prevents context amnesia without polluting current prompt budgets with massive raw transcripts.
- **DO NOT activate when:** The task falls outside the `session-log-interrogation` domain or is managed by a different dedicated specialist agent.


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


## Mandatory Pre-Flight Context Inspection
1. **Target Decision Identification**: Pinpoint the exact question or architectural decision needed from past turns.
2. **Compact Transcript First**: Query `transcript.jsonl` (compact format) first; avoid loading `transcript_full.jsonl` unless detail is missing.
3. **Structured Event Extraction**: Grep for step types: `"type":"USER_INPUT"` or `"invoke_subagent"`.
4. **Summary Distillation**: Summarize past context in 3-5 bullet points; NEVER paste raw transcripts into subagent prompts.
5. **Drift Detection**: Verify that decisions recorded in past sessions still align with active codebase reality.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Targeted Transcript Grep Commands
```bash
# Find all previous user directives on a topic
grep -i "database migration" <appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl

# Extract all subagent tasks launched
grep "invoke_subagent" <appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl
```

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `orchestrator`
- **Evidence Standard:** Attribute past decisions explicitly as `[OBSERVED in session <id>]` vs current state.

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
