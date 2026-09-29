---
name: subagent-driven-development
description: "Use when decomposing complex epics into atomic subagent tasks, orchestrating parallel worker waves, isolating context, and synthesizing results with Tribunal reviews. Enforces out-of-band context and human gate approvals."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - agent-organizer
  - parallel-agents
  - tdd-workflow
  - verification-before-completion
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Subagent-Driven Development (SDD) — Swarm Orchestration Engine

## Activation Boundaries
- **Activate when:** Use when decomposing complex epics into atomic subagent tasks, orchestrating parallel worker waves, isolating context, and synthesizing results with Tribunal reviews. Enforces out-of-band context and human gate approvals.
- **DO NOT activate when:** The task falls outside the `subagent-driven-development` domain or is managed by a different dedicated specialist agent.


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
1. **Epic Deconstructibility**: Verify the epic can be partitioned into atomic tasks touching disjoint file sets.
2. **File Ownership Invariant**: Ensure no two concurrent workers in the same wave edit the same target file.
3. **Context Isolation**: Pass only scoped `task-<N>-brief.md` and file excerpts to subagents; NEVER dump conversation history.
4. **Verification Criteria**: Every subagent brief must define measurable pass/fail criteria (unit test, compiler check, lint).
5. **Fan-In Synthesis**: Collect worker outputs via `allSettled`; resolve conflicting findings before writing disk changes.

## 🛠️ Technical Architecture & Reference Recipes

### 1. The 4-Phase SDD Lifecycle
```
1. DECOMPOSE: Epic ──► Wave 1 (Independent Workers) ──► Wave 2 (Dependent Workers)
2. DISPATCH:   Worker A [backend]     Worker B [frontend]     Worker C [database]
                    │                      │                       │
3. VERIFY:     Run Tests              Run Tests               Run Tests
                    │                      │                       │
4. SYNTHESIZE: Fan-In Aggregation ──► Tribunal Review Wave ──► Human Gate Approval
```

### 2. Scoped Task Brief Contract (`task-brief.md`)
```markdown
# Task Brief: #042 — Auth Middleware Hardening
- **Assigned Specialist**: `backend-specialist`
- **Target Files (Exclusive)**: `src/middleware/auth.ts`, `test/middleware/auth.test.ts`
- **Context Summary**: JWT verification must enforce algorithm whitelist (`HS256`) and check tenant isolation.
- **Constraints**: Do NOT edit `src/app.ts`. Do NOT install external dependencies without approval.
- **Required Verification**: `npm test test/middleware/auth.test.ts` must exit 0 with 100% assertions passing.
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Conflicting Edits in Shared Files** | Two subagents edit the same file simultaneously, causing merge conflicts | Strict partitioning: One subagent owns the file; dependent subagents run in subsequent waves |
| **Worker Failure / Infinite Loop** | A subagent gets stuck repeating the same failing command | Hard limit of 3 retries; if worker fails on attempt 3, mark as BLOCKED and escalate to supervisor |
| **Context Window Saturation** | Subagents consume millions of tokens by re-reading identical files | Orchestrator distributes pre-computed context excerpts via `context_broker.js` |

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `orchestrator`, `agent-organizer`, `resilience-reviewer`
- **Evidence Standard:** All subagent completion claims require verified terminal test output.

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |
