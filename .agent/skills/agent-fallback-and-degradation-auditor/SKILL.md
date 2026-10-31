---
name: agent-fallback-and-degradation-auditor
description: "Use when evaluating fallback policies, alternative model routing, degraded review modes, and ensuring capability and privacy constraints are preserved."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/failure_classifier.js
  - src/runtime_reliability/index.js
inputs:
  fallback_hierarchy: "array"
  service_status: "object"
outputs:
  degradation_findings: "array"
  active_fallback_route: "object"
  fallback_compliance_verdict: "string"
trigger:
  - "agent fallback audit"
  - "graceful degradation check"
  - "model fallback routing"
  - "degraded mode verification"
  - "provider outage fallback"
  - "agent-fallback-and-degradation-auditor"
---

# Agent Fallback & Degradation Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing fallback policies and graceful degradation, inspect these 5 critical parameters:
1. **Fallback Capability Parity**: Verify that alternative models or tools meet the capability, accuracy, and schema requirements of the primary provider.
2. **Privacy & Trust Boundary Preservation**: Ensure fallback routing does not inadvertently transmit sensitive data across unapproved external boundaries.
3. **Explicit Degradation Disclosures**: Require that any execution completed via fallback or reduced reviewer suites is explicitly documented in the report.
4. **Exhaustion Fallback Behavior**: Verify behavior when all fallback tiers fail (must fail closed rather than returning silent empty findings).
5. **No Silent Coverage Reduction**: Disclose any reduction in review depth or reviewer count caused by dependency unavailability.

## Activation Boundaries
- **Activate when:** Evaluating provider redundancy, reviewing multi-model failover chains, auditing offline modes, or verifying degradation policies.
- **DO NOT activate when:** Auditing concurrency backpressure (use `agent-runtime-resource-guard-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Hierarchy Discovery** | Extract declared primary and fallback providers, models, and tool paths. | Fast / Standard / Deep |
| **Pass 2** | **Trigger Rule Audit** | Verify conditions that initiate fallback (e.g. repeated 500 errors, outage status). | All Modes |
| **Pass 3** | **Security & Trust Boundary Check**| Ensure fallback endpoints comply with enterprise security and data privacy baselines. | Standard / Deep |
| **Pass 4** | **Failure Closed Simulation**| Test behavior when both primary and secondary fallback providers are unavailable. | All Modes |
| **Pass 5** | **Findings & Degradation Synthesis**| Emit findings with fallback disclosures, confidence calibration, and boundary advice. | Standard / Deep |

## Verification Command
```bash
node -e "const { FailureClassifier } = require('./src/runtime_reliability'); console.log('Fallback classifier operational');"
```
