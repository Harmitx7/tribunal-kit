---
name: evaluation-methodology-auditor
description: "Use when independently evaluating whether an evaluation proposal or benchmark methodology is scientifically defensible, properly powered, free of cherry-picking, and aligned with measurable success criteria."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/evaluation_methodology_auditor.js
inputs:
  plan: "object"
outputs:
  approved: "boolean"
  verdict: "string"
  risks: "array"
  recommendations: "array"
  powerAnalysis: "object"
trigger:
  - "methodology audit"
  - "evaluate evaluation plan"
  - "cherry picking audit"
  - "experimental validity"
  - "benchmark methodology"
  - "evaluation methodology auditor"
---

# Evaluation Methodology Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing an evaluation plan or methodology specification, inspect these 5 critical parameters:
1. **Measurable Success Criteria**: Require explicit, falsifiable quantitative criteria (e.g. "Recall $\ge 0.90$ with zero critical regressions") rather than vague qualitative ambitions.
2. **Statistical Power & Sample Size**: Verify that sample size is adequate for the claimed precision ($N \ge 10$ minimum for execution, $N \ge 30$ recommended for narrow confidence bounds).
3. **Task-to-Metric Alignment**: Ensure chosen metrics match task topology (e.g., classification requires precision/recall/F1; probabilistic forecasting requires Brier/ECE).
4. **Stochastic Replication Budget**: Mandate that non-deterministic systems (temperature $> 0$) execute at least 3–5 repeated runs to estimate output variance.
5. **Anti-Cherry-Picking Invariant**: Strictly reject evaluation protocols that filter out negative cases, drop failures, or omit baseline comparisons.

## Activation Boundaries
- **Activate when:** Reviewing proposed evaluation designs, vetting pre-deployment benchmark plans, auditing research claims, or checking whether an evaluation setup can support its conclusions.
- **DO NOT activate when:** Executing the actual unit tests or parsing dataset JSON files directly.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Objective Review** | Inspect stated evaluation question, hypotheses, and target operational boundaries. | Fast / Standard / Deep |
| **Pass 2** | **Criteria Check** | Verify presence of measurable, falsifiable success criteria with numeric thresholds. | All Modes |
| **Pass 3** | **Power Analysis** | Audit sample size $N$ and replication count against required statistical confidence levels. | All Modes |
| **Pass 4** | **Metric Alignment** | Check mathematical compatibility between declared task type and chosen scoring metrics. | All Modes |
| **Pass 5** | **Falsification & Verdict** | Check for selective reporting and failure exclusions; emit `METHODOLOGY_APPROVED` or `METHODOLOGY_REJECTED`. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/evaluation_methodology_auditor.test.js
```
