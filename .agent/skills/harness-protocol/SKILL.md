---
name: harness-protocol
description: Rules and guidelines for the Marathon long-running agent harness
---

# Harness Protocol

This skill enforces the rules for the Marathon long-running agent harness.

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
