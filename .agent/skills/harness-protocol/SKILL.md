---
name: harness-protocol
description: Rules and guidelines for the Marathon long-running agent harness
version: 4.0.0
last-updated: 2026-09-07
skills:
  - agentic-patterns
  - behavioral-modes
  - plan-writing
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/session_manager.js
  - .agent/scripts/verify_all.js
---

# Harness Protocol — Long-Running Agent Harness Rules

---

## Mandatory Pre-Flight Context Inspection

Before operating in Marathon long-running harness mode, you MUST inspect:

1. Active session ledger (`task.md`, `session_manager.js`) → Verify active feature specs and task completion status
2. Verification-Before-Completion (VBC) Protocol → Provide concrete proof (test run log, compiler pass) before calling `tk marathon mark pass`
3. Error recovery state machine → Escalate unrecoverable errors after 3 retries via `tk marathon mark fail`

This skill enforces the rules for the Marathon long-running agent harness.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Rules and guidelines for the Marathon long-running agent harness.
- **DO NOT activate when:** The task falls strictly outside harness-protocol domain or belongs to a different dedicated specialist.

## Rules

1. Each session must start with `tk marathon init "spec"`
2. Agents must verify they have completed their current task before running `tk marathon mark pass`
3. If an agent encounters an unrecoverable error, they must run `tk marathon mark fail`
4. The harness is responsible for tracking overall progression.
5. All agents must follow the Verification-Before-Completion (VBC) protocol.

## Pre-Flight Checklist

- Check marathon session state
- Confirm VBC guidelines are followed

## VBC Protocol

- Verify task is complete before marking pass

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
