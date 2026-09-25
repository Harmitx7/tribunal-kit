---
name: agent-syscall-guidelines
description: "Use when defining how agents must interact with the host system via the controlled tool interface (Tribunal OS)."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/syscall_registry.js
---

# Agent Syscall Guidelines (Tribunal OS)

## Overview
Tribunal Kit is migrating from allowing agents raw `bash` access to enforcing a strict, sandboxed **Syscall Boundary**. The model must think of tools not as shell commands, but as managed system calls.

## Directives
1. **Harness Invocation**: Tools MUST be invoked via the `syscall_registry.js` or `harness_manager.js`, not via generic `child_process.exec`.
2. **Schema Validation**: Every syscall requires a strict JSON payload that matches the expected tool schema.
3. **Timeouts & Resources**: The registry enforces strict timeouts (e.g., 5 minutes for tests). Agents should not attempt to write custom timeout logic in bash strings.
4. **Runtime Over Prompt**: Prompt constraints ("Don't delete files") are not enough. The `syscall_registry.js` explicitly whitelists commands (like `npm run build`, `node test.js`) and blocks arbitrary `rm` or `wget` commands.

## Implementation Standard
When designing new tools for agents, always wrap them in a Syscall definition inside the registry, specifying the exact `command`, `args`, and `cwd`. Never pass unsanitized agent strings directly to the shell.
