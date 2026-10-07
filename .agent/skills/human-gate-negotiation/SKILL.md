---
name: human-gate-negotiation
description: "Use when preparing structured impact reports and negotiating approval before executing high-risk, irreversible, or non-idempotent actions (production deploy, database migration, file deletion, permission grants)."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fabel-protocol
  - devops-engineer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/harness_manager.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "human"
  - "gate"
  - "negotiation"
  - "preparing"
---

# Human Gate Negotiation — High-Risk Action Safety Protocol

## Activation Boundaries
- **Activate when:** Use when preparing structured impact reports and negotiating approval before executing high-risk, irreversible, or non-idempotent actions (production deploy, database migration, file deletion, permission grants).
- **DO NOT activate when:** The task falls outside the `human-gate-negotiation` domain or is managed by a different dedicated specialist agent.


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
1. **Action Risk Tier**: Determine Impact Tier (Tier 0: Fast-Pass, Tier 1: Express, Tier 2: Targeted, Tier 3: Full Gauntlet).
2. **Idempotency Check**: Verify whether the action is reversible or non-idempotent (e.g. dropping a column vs adding an index).
3. **Blast Radius Calculation**: Identify all systems, tables, users, or endpoints affected by this mutation.
4. **Pre-Flight Verification Proof**: Confirm all tests and static analysis passed BEFORE requesting human approval.
5. **Rollback Plan**: Formulate explicit, tested rollback commands to undo the action in case of failure.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Mandatory Human Gate Impact Report Schema
```markdown
━━━ 🛑 HUMAN GATE APPROVAL REQUEST ━━━━━━━━━━━━━━━━━
Action:           [Exact command or code modification to be executed]
Target Systems:   [Files, databases, infrastructure resources affected]
Impact Tier:      [Tier 3 — High Blast Radius]

Why It Is Needed: [1-2 sentences stating the concrete business/technical necessity]

Blast Radius:
  - Tables / Columns: [List affected tables/models]
  - Downtime / Locks: [Estimated locking duration, zero-downtime guarantees]
  - Reversibility:    [Fully Reversible / Irreversible without backup]

Pre-Flight Proof:
  - Tests:          ✅ 42/42 passing (test output verified)
  - Static Lint:     ✅ 0 errors, 0 warnings
  - Security Scan:   ✅ 0 critical/high findings

Rollback Procedure:
  - Command:        [Exact rollback command, e.g. alembic downgrade -1]
  - Recovery Time:  [< 30 seconds]

Decision: [Approve (Y) / Reject (N) / Revise (R)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Vague or Casual Approval Prompts** | Asking "Can I run this?" leads to accidental destructive actions | Mandate the 6-point Human Gate Impact Report schema for all Tier 3 actions |
| **Unstoppable Autonomous Run** | Agent continues executing commands while waiting for human response | Put agent into explicit wait/sleep state; block all further tool execution until approval token is received |

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `security-auditor`, `orchestrator`
- **Evidence Standard:** Differentiate `[OBSERVED]` test proof from `[INFERRED]` operational risk.

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |
