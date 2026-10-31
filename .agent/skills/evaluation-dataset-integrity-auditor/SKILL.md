---
name: evaluation-dataset-integrity-auditor
description: "Use when auditing benchmark and evaluation datasets for structural validity, duplicate case IDs, near-duplicate prompt overlap, partition leakage between train and held-out splits, and severe class imbalance."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - data-validation-schemas
  - clean-code
tools: Read, Grep, Bash
scripts-binding:
  - src/evaluation/dataset_integrity_auditor.js
  - src/evaluation/evaluation_schemas.js
inputs:
  dataset: "object"
  train_dataset: "object"
  options: "object"
outputs:
  valid: "boolean"
  violations: "array"
  warnings: "array"
  leakage_detected: "boolean"
trigger:
  - "dataset integrity audit"
  - "benchmark leakage"
  - "duplicate test cases"
  - "class imbalance audit"
  - "evaluation dataset auditor"
  - "evaluation dataset integrity auditor"
---

# Evaluation Dataset Integrity Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing evaluation and benchmark datasets, inspect these 5 critical parameters:
1. **Schema Conformance**: Validate datasets against `EvaluationDatasetSchema` ensuring valid `schemaVersion`, split classification, and non-empty case lists.
2. **Unique Identifier Enforcement**: Verify that every evaluation case possesses a globally unique, non-empty `id`.
3. **Ground-Truth Provenance**: Enforce that every case provides verifiable, descriptive provenance for its expected label (e.g. CVE identifier, human dual-review record).
4. **Semantic Near-Duplicate & Contradiction Detection**: Compute token-level Jaccard similarity across prompt texts; flag near-duplicates ($\ge 0.85$); reject contradictory duplicates with conflicting ground truth labels.
5. **Partition Leakage Defense**: Cross-audit held-out evaluation datasets against training/tuning datasets to prevent contamination and inflated benchmark claims.

## Activation Boundaries
- **Activate when:** Preparing new benchmark datasets, validating synthetic evaluation suites, auditing test fixtures before release, or verifying that prompt tuning did not leak into evaluation splits.
- **DO NOT activate when:** Analyzing runtime model output streams (use `llm-evaluation-engineer` or `confidence-calibration-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Schema Check** | Parse dataset JSON against `EvaluationDatasetSchema`; report structural formatting errors. | Fast / Standard / Deep |
| **Pass 2** | **Provenance Audit** | Inspect `expected.labelProvenance` on every case; reject empty or placeholder strings. | All Modes |
| **Pass 3** | **Similarity Matrix** | Tokenize prompt and task descriptions; compute pairwise Jaccard similarities to catch duplicates. | Standard / Deep |
| **Pass 4** | **Partition Cross-Check** | Compare held-out evaluation tokens against training set tokens; flag contaminated samples. | All Modes |
| **Pass 5** | **Imbalance & Distribution** | Check class label distribution ratios; warn if positive-to-negative ratio exceeds $4:1$. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/dataset_integrity_auditor.test.js
```
