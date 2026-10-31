---
name: mcp-and-tool-supply-chain-security-auditor
description: "Use when auditing MCP servers, tool manifests, dynamic capability expansions, and external tool supply chains for impersonation or tampering."
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
  mcp_config: "object"
outputs:
  supply_chain_verdict: "string"
  untrusted_tools: "array"
trigger:
  - "mcp security audit"
  - "tool supply chain"
  - "mcp server vetting"
  - "dynamic tool expansion"
  - "mcp manifest audit"
  - "mcp-and-tool-supply-chain-security-auditor"
---

# MCP & Tool Supply Chain Security Auditor

## Mandatory Pre-Flight Context Inspection
Before registering or enabling an MCP server or external tool plugin, inspect these 5 critical parameters:
1. **Server Binary Verification**: Ensure server commands do not invoke raw shell interpreters (`bash`, `sh`, `cmd`, `powershell`) with dynamic inline evaluation flags (`-c`, `/c`).
2. **Environment Variable Sanitization**: Reject hardcoded API tokens or secrets in `mcp_config.json` environment blocks; enforce dynamic `$VAR` indirection.
3. **Tool Input Schema Strictness**: Verify that tool arguments enforce strict schemas, reject arbitrary command string injection, and bound path parameters.
4. **Impersonation Defense**: Check tool identifiers against official manifests to prevent typosquatting or namespace collision with trusted core tools.
5. **Least Privilege Scope**: Ensure MCP servers are granted only the specific endpoints required for their declared function.

## Activation Boundaries
- **Activate when:** Adding new MCP servers to `mcp_config.json`, evaluating plugin installations from marketplaces, or reviewing tool registration manifests.
- **DO NOT activate when:** Auditing model prompt content (use `prompt-injection-security-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Server Command Audit** | Inspect server definitions using `auditMcpManifest`; flag shell interpreters. | Fast / Standard / Deep |
| **Pass 2** | **Env Secret Inspection** | Check environment configurations for exposed plaintext credentials. | All Modes |
| **Pass 3** | **Argument Schema Audit** | Validate that tool parameters enforce typed validation rather than arbitrary text sinks. | Standard / Deep |
| **Pass 4** | **Namespace Verification** | Cross-reference tool names against core registry to prevent shadowed tools. | All Modes |
| **Pass 5** | **Vetting Verdict** | Emit supply-chain security report with untrusted server flags and recommendations. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_tool_permission.test.js
```

