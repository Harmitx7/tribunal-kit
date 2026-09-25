---
name: human-gate-negotiation
description: "Use when preparing concise impact reports before approval requests for high-risk, non-idempotent actions."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/harness_manager.js
---

# Human Gate Negotiation

## Context
When an agent attempts a high-risk operation (deploying to production, running `rm -rf`, running a database migration), it MUST be paused, and explicit approval must be sought from the Human Gate. 

## The Impact Report Format
Never just ask "Can I run this?". You must provide a structured report outlining the consequences of the action so the human can make an informed decision.

**Mandatory Report Structure:**
1. **Proposed Action**: The exact command or script to be executed.
2. **Purpose**: Why this is necessary.
3. **Files/Resources Affected**: Which systems will be mutated.
4. **Expected Side Effects**: Downtime, data loss, irreversible state changes.
5. **Verification Status**: Proof that tests passed before reaching this gate.
6. **Rollback Instructions**: How to undo this action if it fails in production.

## Agent Behavior
Once the report is generated, the agent must enter a sleep/wait state and CANNOT proceed until the human explicitly provides an approval token.
