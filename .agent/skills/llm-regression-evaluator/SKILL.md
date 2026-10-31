---
name: llm-regression-evaluator
description: "Use when evaluating candidate model, prompt, or skill revisions against baselines, calculating Wilson score confidence bounds, and enforcing the Non-Masking Safety Invariant."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/llm_regression_evaluator.js
  - src/evaluation/statistical_evaluator.js
inputs:
  candidate_run: "array"
  baseline_run: "array"
  options: "object"
outputs:
  releaseDecision: "string"
  safetyInvariantHeld: "boolean"
  metrics: "object"
trigger:
  - "llm regression evaluation"
  - "model regression test"
  - "prompt diff evaluation"
  - "baseline comparison"
  - "safety regression check"
  - "llm regression evaluator"
---

# LLM Regression Evaluator

## Mandatory Pre-Flight Context Inspection
Before comparing candidate model or prompt runs against a baseline, inspect these 5 critical parameters:
1. **The Non-Masking Safety Invariant**: Enforce that an improvement in aggregate pass rate or non-critical metrics CANNOT permit or excuse even a single critical safety/security regression ($\Delta\text{Critical} = 0$).
2. **Deterministic Baseline Pair Matching**: Match candidate execution records against baseline execution records by unique `caseId`.
3. **Statistical Power via Wilson Score Intervals**: Compute 95% Wilson binomial confidence intervals for both candidate and baseline pass rates to detect statistically meaningful differences.
4. **Severity-Stratified Regression Bucketing**: Partition detected regressions into `CRITICAL_SAFETY_REGRESSIONS` (`CRITICAL` or `HIGH` severity) versus `NON_CRITICAL_REGRESSIONS` (`MEDIUM`, `LOW`, or `INFO`).
5. **Decisive Release Verdicts**: Emit one of:
   - `APPROVE_RELEASE`: Zero regressions and maintained/improved statistical performance.
   - `CONDITIONALLY_APPROVED_WITH_WARNINGS`: Non-critical regressions within overlapping statistical confidence bounds.
   - `REJECTED_WITH_METRIC_REGRESSION`: Statistically significant regression across non-critical scenarios.
   - `REJECTED_WITH_SAFETY_REGRESSION`: Any critical or high-severity scenario regressed.

## Activation Boundaries
- **Activate when:** Evaluating prompt updates, testing newer model checkpoints, comparing routing heuristics against historical baselines, or conducting pre-deployment regression gates.
- **DO NOT activate when:** Evaluating single standalone assertions without an established historical or gold-standard baseline.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Ingest Runs** | Parse and validate both candidate and baseline execution result arrays using `EvaluationResultSchema`. | Fast / Standard / Deep |
| **Pass 2** | **Case Matching** | Build case map and identify matched scenarios, new additions, and missing runs. | Standard / Deep |
| **Pass 3** | **Safety Invariant Check** | Audit all matched cases where baseline passed but candidate failed; flag any `CRITICAL` or `HIGH` cases. | All Modes |
| **Pass 4** | **Wilson Interval Analysis** | Compute 95% Wilson score bounds for candidate and baseline pass rates; test for overlap. | All Modes |
| **Pass 5** | **Verdict & Audit Trail** | Emit final release decision with complete lists of critical regressions, non-critical drops, and new passes. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/llm_regression_evaluator.test.js
```
