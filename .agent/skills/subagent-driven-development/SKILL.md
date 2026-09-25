---
name: subagent-driven-development
description: "Use when decomposing tasks, delegating to subagents, executing code in isolation, and reviewing AI-generated output. Integrates tightly with Tribunal OS governance."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - tdd-workflow
  - verification-before-completion
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
---

# Subagent-Driven Development (SDD)

## Core Philosophy
Monolithic tasks must be broken down into atomic, testable units, delegated to specialized agents, and executed in bounded isolation. No single agent should both write code and approve it for production.

## The SDD Lifecycle
1. **Decomposition**: Break the Epic down into sub-tasks (Waves). No sub-task should touch more than 5 files.
2. **Delegation**: Assign each sub-task to the agent with the most appropriate profile (e.g., `frontend-specialist`, `database-architect`).
3. **Execution (Hands)**: The subagent implements the required changes in a localized context.
4. **Verification**: The subagent runs tests. If tests fail, it iterates.
5. **Review (Tribunal)**: The code changes are subjected to parallel static analysis reviewers (`/tribunal-full`).
6. **Handoff**: The subagent reports back to the Orchestrator with concrete proof of verification.

## Mandatory Guardrails
- **Zero-Trust Delegation**: Never assume a subagent succeeded just because it didn't throw an error. Demand terminal output proof.
- **Context Isolation**: Do NOT pass the entire conversation history to a subagent. Pass only the required `.md` instructions and relevant file paths.

## Failure Handling
If a subagent fails 3 times, the Orchestrator must abort the wave, clean up any uncommitted side-effects, and flag the issue for the Human Gate.
