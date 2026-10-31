---
name: multi-agent-partial-failure-auditor
description: "Use when evaluating multi-agent quorum policies, required versus optional reviewer rules, partial-result aggregation, and preventing masked failures."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/quorum_and_aggregation_engine.js
  - src/runtime_reliability/index.js
inputs:
  quorum_policy: "object"
  agent_results: "array"
outputs:
  quorum_status: "string"
  missing_required_agents: "array"
  partial_coverage_findings: "array"
trigger:
  - "multi agent partial failure audit"
  - "agent quorum verification"
  - "required agent failure check"
  - "partial result aggregation"
  - "masked reviewer failure prevention"
  - "multi-agent-partial-failure-auditor"
---

# Multi-Agent Partial Failure Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing multi-agent partial failures, inspect these 5 critical parameters:
1. **Required vs Optional Agent Policy**: Disclose designated required reviewers (e.g. security, logic) and optional reviewers (e.g. documentation).
2. **Failure Non-Masking Invariant**: If ANY required agent fails, crashes, or times out, the overall workflow status must NEVER be `SUCCEEDED`.
3. **Explicit `PARTIAL` Status Reporting**: Distinguish between full complete success (`SUCCEEDED`), admissible partials (`PARTIAL`), and fatal failures (`FAILED`).
4. **Duplicate Submission Detection**: Detect and flag cases where the same agent submits multiple contradictory findings.
5. **Coverage Gap Transparency**: Report explicit diagnostic findings detailing which areas were unreviewed due to partial agent failures.

## Activation Boundaries
- **Activate when:** Evaluating multi-agent code reviews, verifying parallel swarm dispatchers, aggregating reviewer verdicts, or auditing quorum rules.
- **DO NOT activate when:** Auditing resource budgets and deadlocks (use `agent-runtime-resource-guard-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Policy & Result Ingestion** | Ingest `QuorumPolicySchema` and collect all returned agent results and verdicts. | Fast / Standard / Deep |
| **Pass 2** | **Duplicate & Conflict Check** | Check for multiple or conflicting submissions from the same reviewer ID. | All Modes |
| **Pass 3** | **Required Agent Audit** | Verify that 100% of required reviewers submitted valid, non-error results. | Standard / Deep |
| **Pass 4** | **Threshold & Quorum Evaluation**| Calculate success ratio and evaluate against minimum required percentage threshold. | All Modes |
| **Pass 5** | **Verdict & Gap Synthesis** | Emit `QUORUM_FAILURE` findings and output authoritative consensus verdict. | Standard / Deep |

## Verification Command
```bash
node -e "const { QuorumAndAggregationEngine } = require('./src/runtime_reliability'); console.log('Quorum engine operational');"
```
