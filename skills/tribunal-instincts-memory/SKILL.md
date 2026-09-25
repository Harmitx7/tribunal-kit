---
name: tribunal-instincts-memory
description: "Use when extracting lessons from session logs, resolving repeated failures, creating persistent context, and validating AI memory constraints."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/memory_archivist.js
---

# Tribunal Instincts (Continuous Memory)

## Overview
Tribunal Instincts allows the agent harness to learn from its past mistakes and successful resolutions without blowing up the context window. It extracts concrete lessons from the Event Log and injects them selectively into future sessions.

## Memory Lifecycle
1. **Candidate Extraction**: The `memory-archivist` scans the durable JSONL session log for anomalies, repeated errors, or successful recoveries.
2. **Evidence Validation**: A memory CANNOT be created without a specific Event ID or stack trace proving it happened. Subjective complaints are dropped.
3. **Storage**: Approved lessons are saved to `instincts.json` under specific scopes (e.g., `database`, `ui`).
4. **Context Injection**: During workflow initialization, `context_broker.js` reads only the instincts relevant to the current task.

## Rules of Instinct Retrieval
- **Token Budget**: Never inject more than 5 instincts at a time.
- **Conflict Resolution**: If a newer instinct contradicts an older one, the older one is archived.
- **System Rule Supremacy**: Instincts can NEVER override hardcoded system rules (e.g., `GEMINI.md`). They serve only as technical implementation hints.

## Hallucination Traps
- ❌ Trusting a memory that says "Always use library X" without checking `package.json`.
- ❌ Creating an instinct for a typo. (Only systemic or architectural lessons deserve permanent memory).
