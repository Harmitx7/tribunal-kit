---
name: harness-protocol
description: "Use when Rules and guidelines for the Marathon long-running agent harness"
version: 5.0.0
last-updated: 2026-09-13
skills:
  - agentic-patterns
  - behavioral-modes
  - plan-writing
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/session_manager.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Harness Protocol — Long-Running Agent Harness Rules

---

## 🛠️ Technical Architecture & Reference Recipes

---

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


## 4. Ultrawork and Continuous Validation

The Harness supports "Ultrawork" — long-running autonomous batch processing and background continuous validation inspired by Oh-My-OpenAgent (OmO) Team Mode.
- **Background Execution**: Agents in a marathon session should execute autonomously in the background via the Durable Session Log.
- **Continuous Validation**: Sub-agents continually validate output via the VBC protocol without polling the user.
- **Human-in-the-Loop (HitL)**: Interrupt execution and request user approval *only* at explicit Human Gates (e.g., executing a destructive command or finalizing a milestone). Do not yield to the user for intermediate successes.
