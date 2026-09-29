---
name: thinking-protocol
description: "Use when executing complex cognitive analysis, multi-step problem solving, architecture design, and adversarial evaluation. Enforces structured epistemic confidence levels (L1-L5), counterexample testing, and conciseness."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fabel-protocol
  - behavioral-modes
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/checklist.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Thinking Protocol — Epistemic Rigor & Cognitive Discipline

## Activation Boundaries
- **Activate when:** Use when executing complex cognitive analysis, multi-step problem solving, architecture design, and adversarial evaluation. Enforces structured epistemic confidence levels (L1-L5), counterexample testing, and conciseness.
- **DO NOT activate when:** The task falls outside the `thinking-protocol` domain or is managed by a different dedicated specialist agent.


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
1. **Epistemic Check**: Ask: Do I KNOW this from codebase evidence, or am I GUESSING?
2. **Confidence Calibration**: Classify assertions:
   - **L1 (Certainty)**: Verified directly in active codebase code/schema.
   - **L2 (High)**: Stable standard library / unchanging platform API.
   - **L3 (Moderate)**: Likely pattern requiring `// VERIFY: [reason]`.
   - **L4 (Low)**: Speculative idea requiring immediate search.
   - **L5 (Pure Speculation)**: FORBIDDEN from code generation.
3. **Hypothesis Disproof**: Actively search for evidence that DISPROVES your working theory before proposing fixes.
4. **Zero-Fluff Prose**: Eliminate conversational filler, motivational preambles, and meta-commentary.
5. **Evidence Priority**: Concrete terminal output > code inspection > deductive inference > assumption.

## 🛠️ Technical Architecture & Cognitive Loop

```
1. OBSERVE: Gather verifiable facts from code and test output.
2. HYPOTHESIZE: Formulate minimum falsifiable explanation of the problem.
3. ATTACK: Search for counterexamples and alternative causes.
4. PROVE: Execute code or targeted test to isolate root cause.
5. DECIDE: Implement minimal, high-leverage change with zero side effects.
```

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `logic-reviewer`, `orchestrator`
- **Evidence Standard:** Strict tri-state classification: `[OBSERVED]`, `[INFERRED]`, `[UNVERIFIED]`.

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
