---
name: tribunal-instincts-memory
description: "Use when capturing, distilling, querying, and applying durable architectural lessons and failure post-mortems across sessions. Prevents repeated mistakes and resolves conflicting learned behaviors."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fabel-protocol
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/memory_engine.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Tribunal Instincts & Durable Learning Memory

## Activation Boundaries
- **Activate when:** Use when capturing, distilling, querying, and applying durable architectural lessons and failure post-mortems across sessions. Prevents repeated mistakes and resolves conflicting learned behaviors.
- **DO NOT activate when:** The task falls outside the `tribunal-instincts-memory` domain or is managed by a different dedicated specialist agent.


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
1. **Trigger Identification**: Check if current error or task matches a known failure pattern in durable memory.
2. **Instinct Extraction Criteria**: An instinct is created ONLY when a non-trivial failure is diagnosed and verified with a fix.
3. **Conflict Resolution**: If two learned instincts conflict, prioritize active codebase code over historical instincts.
4. **Generalization Boundary**: Ensure learned rules are scoped to the relevant framework/domain, avoiding over-generalization.
5. **Decay & Pruning**: Remove obsolete instincts when underlying framework versions or libraries are updated.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Instinct Schema Definition
```json
{
  "id": "instinct-042-fastapi-blocking-io",
  "domain": "backend",
  "trigger": "async def with blocking IO",
  "root_cause": "Calling time.sleep() or sync DB inside async def freezes event loop",
  "remediation": "Use def for sync libraries or await asyncio.sleep()",
  "evidence_test": "test/integration/event_loop.test.py",
  "confidence": 0.95
}
```

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `memory-archivist`, `orchestrator`
- **Evidence Standard:** Every stored instinct must link to concrete reproduction code and verified test proof.

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
