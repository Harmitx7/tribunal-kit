---
name: thinking-protocol
description: Tribunal Agent Kit thinking and cognitive reasoning rules. Helps agents structure their thoughts and follow protocols.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - fabel-protocol
  - behavioral-modes
  - clean-code
scripts-binding:
  - .agent/scripts/checklist.js
  - .agent/scripts/verify_all.js
---

# Thinking Protocol — Cognitive Reasoning Rules

---

## Mandatory Pre-Flight Context Inspection

Before beginning any cognitive reasoning loop, you MUST inspect:

1. Cognitive Boundaries (Fabel Protocol) → Verify epistemic certainty levels L1 through L5
2. Precision Budget → Scale tool calls to task complexity (Simple: 1 call, Medium: 3-5 calls, Deep: 5-10 calls)
3. Stale Context rules → Re-read files after every edit to update internal context representation

Guidelines for structural reasoning and cognitive loop execution.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Tribunal Agent Kit thinking and cognitive reasoning rules. Helps agents structure their thoughts and follow protocols..
- **DO NOT activate when:** The task falls strictly outside thinking-protocol domain or belongs to a different dedicated specialist.

## Pre-Flight Checklist

Before generating any output or proposing code modifications:

- Verify that requirements are clear and unambiguous.
- Ensure that the suggested approach minimizes technical debt.

## Verification-Before-Completion (VBC) Protocol

Before completing a task, confirm:

- Syntax, structure, and type safety constraints are met.
- Relevant tests have been run and passed successfully.

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
