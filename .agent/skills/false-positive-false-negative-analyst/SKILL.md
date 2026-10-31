---
name: false-positive-false-negative-analyst
description: "Use when quantifying classification errors made by AI reviewers, constructing confusion matrices, calculating precision, recall, specificity, F1, FPR, and FNR, and investigating root causes of errors."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/reliability_metrics_engine.js
inputs:
  prediction_actual_pairs: "array"
  options: "object"
outputs:
  confusion_matrix: "object"
  metrics: "object"
  denominators: "object"
  zero_denominator_flags: "object"
trigger:
  - "false positive analysis"
  - "false negative analysis"
  - "confusion matrix"
  - "precision recall f1"
  - "error rate calculation"
  - "false positive false negative analyst"
---

# False-Positive & False-Negative Analyst

## Mandatory Pre-Flight Context Inspection
Before computing error rates and confusion matrices, inspect these 5 critical parameters:
1. **Explicit Positive Class Definition**: Clearly declare what constitutes a positive case (e.g. `VULNERABLE`, `FAIL`, `DEFECT_PRESENT`).
2. **Explicit Denominator Tracking**: Report the exact sample count ($N$) and denominators for precision ($TP + FP$), recall ($TP + FN$), and specificity ($TN + FP$).
3. **Safe Division Invariant**: Guarantee that zero denominators return `0.0` and set explicit `zeroDenominatorFlags` rather than emitting `NaN` or crashing.
4. **Error Severity Categorization**: Distinguish high-impact false negatives (critical security flaws missed by the model) from low-impact cosmetic false alarms.
5. **Root-Cause Error Taxonomy**: Group misclassifications by root causes (e.g. prompt ambiguity, complex AST recursion, context window truncation, missing type declarations).

## Activation Boundaries
- **Activate when:** Evaluating model classification performance, diagnosing reviewer noisy alert rates, benchmarking detector recall on known vulnerability databases, or tuning detection thresholds.
- **DO NOT activate when:** Analyzing open-ended generative writing without labeled binary or categorical ground truth.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Ingest Pairs** | Ingest prediction-actual pairs; validate against declared positive class label. | Fast / Standard / Deep |
| **Pass 2** | **Matrix Construction** | Tally True Positives ($TP$), False Positives ($FP$), True Negatives ($TN$), and False Negatives ($FN$). | All Modes |
| **Pass 3** | **Metric Derivation** | Compute Precision, Recall, Specificity, F1, False Positive Rate ($FPR$), and False Negative Rate ($FNR$). | All Modes |
| **Pass 4** | **Error Dissection** | Extract all $FP$ and $FN$ instances; analyze code snippets and prompts to identify failure patterns. | Standard / Deep |
| **Pass 5** | **Remediation Strategy** | Formulate targeted prompt updates, AST pre-filters, or threshold adjustments to reduce dominant error types. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/reliability_metrics_engine.test.js
```
