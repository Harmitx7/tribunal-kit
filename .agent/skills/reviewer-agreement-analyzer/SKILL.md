---
name: reviewer-agreement-analyzer
description: "Use when measuring consensus, inter-reviewer consistency, and useful disagreement across specialist AI reviewers using Cohen's and Fleiss' Kappa, detecting contradictions, and preserving minority evidence."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - testing-patterns
  - property-based-testing
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/reliability_metrics_engine.js
inputs:
  reviewer_findings: "array"
  options: "object"
outputs:
  cohens_kappa: "number"
  fleiss_kappa: "number"
  observed_agreement: "number"
  contradictions: "array"
trigger:
  - "reviewer agreement"
  - "inter-reviewer consistency"
  - "fleiss kappa"
  - "cohens kappa"
  - "reviewer contradiction analysis"
  - "reviewer agreement analyzer"
---

# Reviewer Agreement Analyzer

## Mandatory Pre-Flight Context Inspection
Before analyzing agreement across multi-reviewer audits, inspect these 5 critical parameters:
1. **Chance-Corrected Agreement**: Use Cohen's Kappa for paired evaluations and Fleiss' Kappa for 3+ multi-rater panels to avoid misleading raw agreement percentages.
2. **Category Normalization**: Align reviewer categorical verdicts (e.g. `PASS` vs `FAIL`, `SAFE` vs `VULNERABLE`) into mutually exclusive classification buckets.
3. **Contradiction Detection**: Actively isolate irreconcilable conflicts (e.g. Security flags `CRITICAL_INJECTION` while Performance claims `CLEAN`) for human adjudication.
4. **Minority Evidence Preservation**: Never discard a well-supported minority finding with concrete line-level proofs merely because the majority disagreed.
5. **Epistemic Weighting**: Weight reviewer findings backed by deterministic test executions ($E_2/E_5$) unconditionally over model opinions ($E_0$).

## Activation Boundaries
- **Activate when:** Evaluating multi-agent swarm review outputs, measuring reliability across Tribunal specialist reviewers, calculating inter-annotator agreement on gold-standard datasets, or detecting reviewer blind spots.
- **DO NOT activate when:** Analyzing a single reviewer's output in isolation (use `hallucination-detection-auditor` instead).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Ingest Findings** | Collect findings from all participating specialist reviewers; group by target file and line. | Fast / Standard / Deep |
| **Pass 2** | **Category Alignment** | Map qualitative reviewer recommendations into standardized categorical decision vectors. | Standard / Deep |
| **Pass 3** | **Statistical Consensus** | Compute Cohen's Kappa ($\kappa$) for paired reviewers or Fleiss' Kappa for 3+ reviewers. | All Modes |
| **Pass 4** | **Contradiction Isolation** | Identify diametrically opposed verdicts on identical code elements; check evidence backing. | All Modes |
| **Pass 5** | **Synthesis & Human Gate** | Retain valid minority findings; escalate unresolvable contradictions to human gate. | Standard / Deep |

## Agreement Interpretation Scale
- **$\kappa \ge 0.80$**: Almost perfect agreement (high consensus).
- **$0.60 \le \kappa < 0.80$**: Substantial agreement (reliable panel).
- **$0.40 \le \kappa < 0.60$**: Moderate agreement (moderate divergence; review criteria).
- **$\kappa < 0.40$**: Poor agreement (high ambiguity; check prompt alignment or task ambiguity).

## Verification Command
```bash
npx jest test/unit/reliability_metrics_engine.test.js
```
