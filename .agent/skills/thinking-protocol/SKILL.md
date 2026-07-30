---
name: thinking-protocol
description: Tribunal Agent Kit thinking and cognitive reasoning rules. Helps agents structure their thoughts and follow protocols.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
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

## Pre-Flight Checklist

Before generating any output or proposing code modifications:
- Verify that requirements are clear and unambiguous.
- Ensure that the suggested approach minimizes technical debt.

## Verification-Before-Completion (VBC) Protocol

Before completing a task, confirm:
- Syntax, structure, and type safety constraints are met.
- Relevant tests have been run and passed successfully.
