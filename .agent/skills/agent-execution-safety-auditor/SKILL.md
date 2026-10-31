---
name: agent-execution-safety-auditor
description: "Use when auditing execution sinks, shell command construction, path arguments, path traversal attempts, and dry-run scope fidelity."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/execution_safety_engine.js
  - src/security/boundary.js
  - src/security/index.js
inputs:
  command_string: "string"
  target_path: "string"
outputs:
  execution_safe: "boolean"
  violations: "array"
  sanitized_command: "string"
trigger:
  - "execution safety audit"
  - "command sink inspection"
  - "shell injection check"
  - "agent execution sandbox"
  - "path traversal audit"
  - "agent-execution-safety-auditor"
---

# Agent Execution Safety Auditor

## Mandatory Pre-Flight Context Inspection
Before approving or executing agent-generated commands or file operations, inspect these 5 critical parameters:
1. **Shell Chaining & Operator Ban**: Disallow unescaped chaining operators (`;`, `&&`, `||`, `|`, `&`, `eval`, `exec`, backticks, `$()`).
2. **Destructive Command Blocking**: Prohibit recursive root deletions (`rm -rf /`), disk formatting (`mkfs`, `format`), wildcard permission escalations (`chmod 777`), and curl-to-shell piping.
3. **Environment Hijack Prevention**: Block modifications to runtime loader variables (`LD_PRELOAD`, `LD_LIBRARY_PATH`, `NODE_OPTIONS`).
4. **Filesystem Containment Invariant**: Enforce `assertWithinRoot(authorizedRoot, targetPath)` to stop relative path traversal (`../`) and symlink escapes.
5. **Dry-Run Scope Fidelity**: Ensure high-risk operations support and enforce non-destructive `--dry-run` or inspection passes prior to file mutation.

## Activation Boundaries
- **Activate when:** Evaluating agent tool proposals to run shell commands, create or edit files, or execute CLI tasks.
- **DO NOT activate when:** Auditing tool authorization scopes without command arguments (use `agent-tool-permission-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Shell Operator Scan** | Scan command strings for dangerous chaining and substitution operators. | Fast / Standard / Deep |
| **Pass 2** | **Destructive Pattern Check** | Match commands against `DESTRUCTIVE_COMMAND_PATTERNS`. | All Modes |
| **Pass 3** | **Path Containment Audit** | Execute `auditPathContainment` on all filesystem target paths using `assertWithinRoot`. | Standard / Deep |
| **Pass 4** | **Dry-Run Fidelity Check** | Verify whether mutation commands include non-destructive inspection flags. | All Modes |
| **Pass 5** | **Execution Triage** | Emit an execution safety report; reject commands violating safety invariants. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_execution_safety.test.js
```

