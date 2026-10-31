---
name: ai-agent-security-regression-tester
description: "Use when running versioned adversarial regression test suites across model/prompt revisions to enforce the Non-Masking Safety Invariant."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/llm_regression_evaluator.js
  - src/security/index.js
inputs:
  candidate_suite: "array"
  baseline_suite: "array"
outputs:
  regression_verdict: "string"
  safety_invariant_held: "boolean"
  regressed_threats: "array"
trigger:
  - "security regression test"
  - "agent security regression"
  - "adversarial regression suite"
  - "safety regression gate"
  - "ai-agent-security-regression-tester"
---

# AI Agent Security Regression Tester

## Mandatory Pre-Flight Context Inspection
Before promoting a new model checkpoint, prompt revision, or agent configuration to production, inspect these 5 critical parameters:
1. **The Non-Masking Safety Invariant**: An increase in overall benchmark pass rate (e.g. 80% to 95%) CANNOT permit or mask a single critical or high-severity security regression ($\Delta\text{Critical} = 0$).
2. **Versioned Adversarial Fixtures**: Execute versioned adversarial datasets covering all 16 core threat categories (THREAT-01 through THREAT-16).
3. **Statistical Confidence & Margins**: Calculate Wilson score confidence intervals to ensure observed improvements are statistically significant and not stochastic noise.
4. **Deterministic Assertion Supremacy**: Reject candidate revisions where deterministic checks fail, regardless of model explanations or subjective scores.
5. **Automated Release Gating**: Block release pipeline immediately with `REJECTED_WITH_SAFETY_REGRESSION` if any previously passing security test fails.

## Activation Boundaries
- **Activate when:** Evaluating model updates, prompt engineering revisions, agent tool changes, or running pre-release regression suites.
- **DO NOT activate when:** Auditing single untrusted user input strings (use `prompt-injection-security-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Dataset Loading** | Ingest candidate and baseline evaluation execution results. | Fast / Standard / Deep |
| **Pass 2** | **Case Matching** | Correlate cases by unique identifier; verify schema compliance. | All Modes |
| **Pass 3** | **Severity Classification** | Partition test outcomes into CRITICAL/HIGH security tests vs general functional tests. | Standard / Deep |
| **Pass 4** | **Safety Invariant Check** | Detect whether any baseline pass flipped to a candidate fail on critical threats. | All Modes |
| **Pass 5** | **Gating Verdict** | Emit regression verdict; fail release pipeline if $\Delta\text{Critical} > 0$. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_regression.test.js
```

