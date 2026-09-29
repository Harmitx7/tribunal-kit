---
name: agent-syscall-guidelines
description: "Use when defining, invoking, or auditing agent system calls and tool executions in Tribunal OS. Enforces schema validation, argument sandboxing, path normalization, timeout boundaries, and command whitelisting."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fabel-protocol
  - agentshield-security
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/syscall_registry.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Agent Syscall Guidelines — Tribunal OS Controlled Tool Boundary

## Activation Boundaries
- **Activate when:** Use when defining, invoking, or auditing agent system calls and tool executions in Tribunal OS. Enforces schema validation, argument sandboxing, path normalization, timeout boundaries, and command whitelisting.
- **DO NOT activate when:** The task falls outside the `agent-syscall-guidelines` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


## Mandatory Pre-Flight Context Inspection
1. **Syscall Registration**: Verify the invoked tool exists in `.agent/scripts/syscall_registry.js`.
2. **Payload Schema**: Validate tool parameters against Zod schema definitions before execution.
3. **Path Sanitization**: Normalize file paths across Windows backslashes and POSIX slashes; disallow path traversal (`../`).
4. **Execution Timeout**: Enforce strict execution timeouts on all syscalls (default 30s, max 300s for test suites).
5. **Output Buffering**: Limit output capture to 64KB to prevent context window saturation and out-of-memory errors.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Controlled Syscall Dispatch Flow
```
Agent Request
     │
     ▼
[Syscall Registry] ──(Schema Validation via Zod)──► Invalid ──► Error Return
     │ (Valid)
     ▼
[Security Whitelist Guard] ──(Block dangerous args: rm -rf, curl | bash)
     │ (Permitted)
     ▼
[Sandboxed Runner] ──(Enforce Timeout + Output Cap 64KB)
     │
     ▼
Sanitized Tool Result returned to Agent
```

### 2. Whitelist Enforcement & Path Normalization
```javascript
const path = require('path');

function sanitizeWorkspacePath(targetPath, workspaceRoot) {
  const resolved = path.resolve(workspaceRoot, targetPath);
  if (!resolved.startsWith(path.resolve(workspaceRoot))) {
    throw new Error(`Syscall Security Violation: Access outside workspace forbidden: ${targetPath}`);
  }
  return resolved;
}
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Infinite Subprocess Hang** | Interactive CLI command (e.g. waiting for y/N stdin) hangs process | Enforce strict `timeout` and pass non-interactive flags (`-y`, `--yes`, `CI=true`) |
| **Output Token Flooding** | Running `git log` or dumping 10MB file blows prompt context limit | Truncate stdout at 64KB with an explicit warning marker `[TRUNCATED]` |
| **Shell Injection via Args** | Passing unsanitized user strings into `child_process.exec()` | Use `child_process.execFile()` with array-based arguments, never shell interpolation |

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `security-auditor`, `platform-engineer`, `orchestrator`
- **Evidence Standard:** Differentiate `[OBSERVED]` command payloads from `[INFERRED]` execution outcomes.

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |
