---
name: agent-tool-permission-auditor
description: "Use when auditing tool capabilities, detecting wildcard grants, enforcing least privilege, and preventing confused-deputy privilege escalation."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/tool_permission_engine.js
  - src/security/index.js
inputs:
  tool_manifests: "array"
  requested_capabilities: "array"
outputs:
  permission_verdict: "string"
  excessive_grants: "array"
  least_privilege_policy: "object"
trigger:
  - "tool permission audit"
  - "least privilege agent"
  - "wildcard permission check"
  - "confused deputy detection"
  - "tool boundary check"
  - "agent-tool-permission-auditor"
---

# Agent Tool Permission Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing agent tools and execution permissions, inspect these 5 critical parameters:
1. **Wildcard Capability Prohibition**: Reject wildcard grants (`*`, `fs:*`, `exec:*`, `all`, `admin`) that bypass capability isolation.
2. **Least Privilege Scoping**: Verify that tools granted to an agent match the minimum required permissions for the specific task.
3. **Confused-Deputy Defense**: Verify that untrusted inputs or low-privilege callers cannot trigger privileged sinks without human authorization.
4. **Execution Boundary Authorization**: Ensure authorization checks reside at the tool execution boundary in Zone 1, rather than relying on model natural language compliance.
5. **Human Gate Verification**: Verify that destructive sinks (`delete_file`, `exec_shell`, `write_arbitrary_file`) enforce explicit Zone 0 sign-off.

## Activation Boundaries
- **Activate when:** Granting tools to subagents, onboarding MCP servers, reviewing agent capability manifests, or investigating privilege escalation vectors.
- **DO NOT activate when:** Auditing raw shell command syntax safety (use `agent-execution-safety-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Wildcard Scan** | Scan tool manifests for wildcard strings (`*`, `exec:*`, `all`); reject immediately. | Fast / Standard / Deep |
| **Pass 2** | **High-Risk Classification** | Identify tools exposing file write, code evaluation, shell execution, or network sinks. | All Modes |
| **Pass 3** | **Capability Delta Audit** | Compare granted capabilities against requested task capabilities; flag excessive permissions. | Standard / Deep |
| **Pass 4** | **Confused-Deputy Check** | Validate caller privilege levels against requested sinks using `detectConfusedDeputy`. | All Modes |
| **Pass 5** | **Policy Hardening** | Generate a minimal, scoped policy using `generateLeastPrivilegePolicy`. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_tool_permission.test.js
```

