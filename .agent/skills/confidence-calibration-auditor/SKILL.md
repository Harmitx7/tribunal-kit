---
name: confidence-calibration-auditor
description: "Use when evaluating whether AI agent confidence corresponds to empirical correctness, auditing Brier scores, computing Expected Calibration Error (ECE), and diagnosing overconfidence or underconfidence."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/reliability_metrics_engine.js
inputs:
  predictions: "array"
  num_bins: "number"
outputs:
  brier_score: "number"
  ece: "number"
  diagnosis: "string"
  bins: "array"
trigger:
  - "confidence calibration"
  - "audit confidence"
  - "brier score"
  - "expected calibration error"
  - "overconfidence check"
  - "confidence calibration auditor"
---

# Confidence Calibration Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing confidence calibration, inspect these 5 critical parameters:
1. **Numeric Probability Validity**: Ensure all input confidence estimates are valid numbers within the closed interval $[0.0, 1.0]$. Reject non-numeric or unmapped subjective strings.
2. **Proper Scoring Rule (Brier Score)**: Calculate mean squared error between predicted probabilities and binary ground-truth outcomes: $\text{Brier} = \frac{1}{N} \sum (p_i - y_i)^2$.
3. **Partitioned Calibration Error (ECE)**: Bin predictions into $M$ uniform probability brackets (default $M=10$) to measure weighted divergence between average confidence and observed accuracy.
4. **Anomalous Bracket Diagnosis**: Detect `OVERCONFIDENT` models when high-confidence bins ($p \ge 0.70$) have accuracy gaps $> 0.15$; detect `UNDERCONFIDENT` models when low-confidence bins have high accuracy.
5. **Sample Size Disclosure**: Explicitly report total evaluated samples ($N$); refuse to certify calibration if $N < 10$.

## Activation Boundaries
- **Activate when:** Measuring model uncertainty calibration, checking whether 99% confident agent claims are actually accurate, evaluating Brier loss across prompt iterations, or generating reliability diagrams.
- **DO NOT activate when:** The agent only produces deterministic binary labels without probabilistic or numeric confidence values.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Ingest & Validate** | Validate prediction array; verify probability bounds $[0, 1]$ and boolean ground truth labels. | Fast / Standard / Deep |
| **Pass 2** | **Score Calibration** | Compute overall Brier score across all valid sample pairs. | All Modes |
| **Pass 3** | **Bin Partitioning** | Distribute predictions into probability bins; compute bin counts, mean confidence, and empirical accuracy. | Standard / Deep |
| **Pass 4** | **Diagnostic Audit** | Evaluate divergence per bin; classify overall system as `WELL_CALIBRATED`, `OVERCONFIDENT`, or `UNDERCONFIDENT`. | All Modes |
| **Pass 5** | **Remediation Plan** | Provide concrete prompt or temperature adjustments to recalibrate model output probabilities. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/confidence_calibration.test.js
```
