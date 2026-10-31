---
name: ai-data-leakage-auditor
description: "Use when injecting and tracking synthetic canary values, checking for credential exposure across prompts, retrieval chunks, tool arguments, and report outputs."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/data_leakage_engine.js
  - .agent/scripts/secret_redactor.js
  - src/security/index.js
inputs:
  trace_records: "array"
  canaries: "array"
outputs:
  leaks_detected: "number"
  canaries_found: "array"
  sanitized_output: "string"
trigger:
  - "ai data leakage"
  - "canary token tracking"
  - "credential exfiltration audit"
  - "secret exposure agent"
  - "prompt leak detection"
  - "ai-data-leakage-auditor"
---

# AI Data Leakage Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing content or traces for sensitive data leakage, inspect these 5 critical parameters:
1. **Synthetic Canary Generation**: Generate unique, high-entropy tokens (`CANARY_SECRET_<UUID>`) before executing adversarial or prompt tests.
2. **Multi-Surface Canary Tracking**: Monitor prompts, retrieved context, tool parameters, error stacks, and generated report outputs for canary tokens.
3. **Comprehensive Credential Redaction**: Validate outputs against `secret_redactor.js` patterns covering API keys (`sk-`, `sk-ant-`, `sk-proj-`), JWTs, private keys, database URLs, and AWS access keys.
4. **Error Stack Sanitization**: Ensure uncaught exceptions or parser failures do not leak file contents or sensitive tokens into client responses.
5. **Report & Evidence Scrubbing**: Verify that all machine-readable JSON artifacts and markdown findings contain redacted tokens (`[REDACTED_...]`).

## Activation Boundaries
- **Activate when:** Preparing pre-deploy verification suites, auditing generated review reports, running adversarial jailbreak tests, or sanitizing execution logs.
- **DO NOT activate when:** Auditing model behavioral reliability metrics (use `reliability-metrics-engine`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Canary Token Audit** | Check all outputs against registered active canary tokens using `scanForDataLeakage`. | Fast / Standard / Deep |
| **Pass 2** | **Credential Pattern Scan** | Execute `secret_redactor.js` regex scanner against strings, objects, and nested arrays. | All Modes |
| **Pass 3** | **Error Log Inspection** | Inspect stack traces and exception messages for leaked file snippets or tokens. | Standard / Deep |
| **Pass 4** | **Sanitization Verification** | Validate that redacted outputs replace secrets with standard `[REDACTED_...]` tags. | All Modes |
| **Pass 5** | **Leakage Report Synthesis** | Emit structured leakage findings and calculate leak incidence rate. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_data_leakage.test.js
```

