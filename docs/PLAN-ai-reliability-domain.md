# Implementation Plan: AI Reliability & Evaluation Domain (Domain A)

**Domain:** `ai-reliability`  
**Display Name:** AI Reliability & Evaluation  
**Target Repository:** `tribunal-kit` v9.3.0  
**Status:** Awaiting Human Approval (Gate Step)  
**Active Agent:** `project-planner`  

---

## 1. Goal

Establish a production-grade, mathematically verified AI Reliability & Evaluation domain (`ai-reliability`) inside Tribunal-Kit featuring 9 canonical skills, a versioned 30-category evaluation dataset, rigorous metrics (ECE, Brier, Cohen/Fleiss Kappa, confusion matrix), strict Non-Masking Safety Invariant enforcement, and independent release certification.

---

## 2. Socratic Gate (Pre-Flight Context Assessment)

1. **GOAL:** What specific outcome defines success?
   - Complete, verified integration of `ai-reliability` with 9 operational skills in `.agent/skills/` (and mirrors `skills/`, `.agents/skills/`), registered in `.agent/skill_topic_map.json`, passing all canonical skill validations (`validate-references.js`, `validate-instructions.js`), backed by a 30-scenario versioned evaluation dataset (`EvaluationDatasetSchema`), deterministic unit/integration/adversarial/mutation test suites, and producing an evidence-grounded `AI_RELIABILITY_CERTIFICATION_REPORT.md` and machine-readable certification artifact.
2. **USERS:** Who uses this?
   - AI code reviewers, orchestrators, human auditors, and CI/CD pipelines evaluating agent finding veracity, detecting hallucinations/ghost packages, assessing confidence calibration, and guarding against model/prompt behavioral regressions.
3. **SCOPE:** What is explicitly OUT of scope?
   - Modifying external CLI commands, changing existing public MCP endpoints, rewiring unrelated specialist reviewer implementations (e.g. mobile or frontend UI reviewers), or altering upstream Node.js/Rust build configs.
4. **RISK:** What is the highest-risk assumption?
   - Inadvertently breaking the skill count invariant (`EXPECTED_SKILL_COUNT`) enforced across `validate-instructions.js` when incrementing skills from 320 to 329, or introducing non-deterministic execution flakiness in evaluation runners.
5. **STACK:** Is the technology stack decided?
   - Node.js (CommonJS + ES Module bridges), Zod (`zod`), Jest test harness (`jest`), Wilson Score statistics (`statistical_evaluator.js`), and existing Tribunal sandboxing (`WorktreeSandbox`, `claim_check_separator.js`). No new external runtime dependencies will be added.

---

## 3. Phase 0 Reconnaissance & Baseline Audit Summary

- **Repository Root:** `tribunal-kit` (inside workspace `cli project`)
- **Git Branch:** `main` (commit `781959c`)
- **Existing Baseline:**
  - `node scripts/validate-references.js` → **100% Passed** (320 skills, 129 links, 39 references).
  - `node scripts/validate-instructions.js` → **100% Passed** (52 workflows, 320 skills, 28 reviewers).
  - `npx jest test/unit/statistical_evaluator.test.js` → **20 passed, 20 total**.
- **Existing Assets Identified in `src/evaluation/`:**
  - `evaluation_schemas.js`: Zod contracts for cases, results, datasets.
  - `reliability_metrics_engine.js`: Confusion matrix, Brier score, ECE, Cohen's & Fleiss' Kappa.
  - `dataset_integrity_auditor.js`: Jaccard near-duplicate detector, split leakage auditor.
  - `hallucination_detection_auditor.js`: Ghost package, invented API, and 5-state epistemic verdict auditor.
  - `llm_regression_evaluator.js`: Non-Masking Safety Invariant & Wilson score comparison.
  - `agent_behavioral_testing_engine.js`: Precondition, required properties, forbidden behaviors tester.
  - `evaluation_methodology_auditor.js`: Experimental validity & cherry-picking auditor.
- **Genuine Capability Gaps Identified:**
  - 9 candidate skills missing from `.agent/skills/`, `skills/`, `.agents/skills/`.
  - Missing `ai-reliability` domain in `.agent/skill_topic_map.json`.
  - Placeholder test `test/unit/confidence_calibration.test.js` merely asserts `15 - 14 === 1`.
  - Missing unit tests for the 7 new evaluation engines.
  - Missing canonical 30-category versioned evaluation dataset file.
  - Missing adversarial, mutation, and integration test suites.
  - Missing machine-readable certification artifact and release report.

---

## 4. Phase 1 Architecture & Capability Boundaries

### 4.1 Skill Portfolio Decision Matrix
All 9 proposed skills address verified capability gaps and will be established canonically:

| Identifier | Domain | Canonical Path | Primary Responsibility |
|:---|:---|:---|:---|
| `llm-evaluation-engineer` | `ai-reliability` | `.agent/skills/llm-evaluation-engineer/SKILL.md` | Designs & executes reproducible evaluations; defines criteria & dataset sampling. |
| `hallucination-detection-auditor` | `ai-reliability` | `.agent/skills/hallucination-detection-auditor/SKILL.md` | Deconstructs claims, checks line/AST proofs on disk, flags ghost packages, assigns 5-state verdicts. |
| `confidence-calibration-auditor` | `ai-reliability` | `.agent/skills/confidence-calibration-auditor/SKILL.md` | Audits predicted confidence vs empirical accuracy using Brier score and binned ECE. |
| `agent-behavioral-testing` | `ai-reliability` | `.agent/skills/agent-behavioral-testing/SKILL.md` | Tests agents/skills against positive invariants, negative traps, and forbidden side-effects. |
| `llm-regression-evaluator` | `ai-reliability` | `.agent/skills/llm-regression-evaluator/SKILL.md` | Evaluates candidate revisions vs baseline; enforces Non-Masking Safety Invariant ($\Delta\text{Critical} = 0$). |
| `reviewer-agreement-analyzer` | `ai-reliability` | `.agent/skills/reviewer-agreement-analyzer/SKILL.md` | Measures pairwise & multi-rater consensus using Cohen's & Fleiss' Kappa; isolates contradictions. |
| `false-positive-false-negative-analyst` | `ai-reliability` | `.agent/skills/false-positive-false-negative-analyst/SKILL.md` | Calculates precision, recall, F1, FPR, FNR with safe denominators; categorizes error root causes. |
| `evaluation-dataset-integrity-auditor` | `ai-reliability` | `.agent/skills/evaluation-dataset-integrity-auditor/SKILL.md` | Audits datasets for split leakage, near-duplicate prompts, and class imbalance. |
| `evaluation-methodology-auditor` | `ai-reliability` | `.agent/skills/evaluation-methodology-auditor/SKILL.md` | Audits experimental validity, statistical power ($N \ge 30$), and guards against cherry-picking. |

### 4.2 Epistemic Invariants
- **Deterministic Supremacy:** Observed execution ($E_2/E_5$) unconditionally overrides unverified AI claims ($E_0$).
- **Non-Masking Safety Invariant:** High aggregate accuracy or improvement in non-critical metrics CANNOT permit or conceal a critical safety/security regression.

---

## 5. Topological Wave Plan

```
Wave 1 — Evaluation Dataset & Ground Truth Fixtures
├── Create test/fixtures/ai_reliability/evaluation_dataset_v1.json (30 categories)
└── Verify dataset schema adherence via EvaluationDatasetSchema

Wave 2 — Core Engine Tests & Confidence Calibration Replacement
├── Replace hollow test/unit/confidence_calibration.test.js with full ECE & Brier suite
├── Add test/unit/reliability_metrics_engine.test.js (Confusion Matrix, Cohen's & Fleiss' Kappa)
├── Add test/unit/evaluation_schemas.test.js (Case, Result, Dataset schemas & secret redaction)
└── Add test/unit/dataset_integrity_auditor.test.js (Leakage, duplicates, class imbalance)

Wave 3 — Specialized Engine Tests & Auditors
├── Add test/unit/hallucination_detection_auditor.test.js (5-state verdicts, ghost packages, disk evidence)
├── Add test/unit/llm_regression_evaluator.test.js (Non-masking safety invariant, Wilson score bounds)
├── Add test/unit/agent_behavioral_testing.test.js (Contracts, required/forbidden assertions, timeouts)
└── Add test/unit/evaluation_methodology_auditor.test.js (Power analysis, metric alignment, cherry-picking)

Wave 4 — Canonical Skill Authoring & Synchronization
├── Author 9 canonical skills under .agent/skills/<skill-name>/SKILL.md
├── Register domain 'ai-reliability' in .agent/skill_topic_map.json (320 -> 329 skills)
├── Update EXPECTED_SKILL_COUNT to 329 in scripts/validate-instructions.js & system-prompt.md
├── Run node scripts/sync-skills.js to mirror into skills/ and .agents/skills/
└── Validate zero drift with node scripts/validate-references.js and validate-instructions.js

Wave 5 — Adversarial Testing, Mutation Testing & Integration
├── Add test/unit/ai_reliability_adversarial.test.js (Prompt injection, path traversal, corrupted data)
├── Add test/unit/ai_reliability_mutation.test.js (Controlled mutations on ECE, Kappa, safety gates)
└── Add test/integration/ai_reliability_domain.test.js (End-to-end evaluation pipeline execution)

Wave 6 — Certification Artifacts & Release Audit
├── Execute certify script / test suites to generate empirical test evidence
├── Generate AI_RELIABILITY_CERTIFICATION_REPORT.md
└── Output machine-readable certification artifact benchmarks/artifacts/ai_reliability_certification.json
```

---

## 6. Verification Plan & Release Gates

1. **Gate A: Repository Integrity:**
   - Pre-existing files and user changes preserved intact; zero unrelated files discarded.
2. **Gate B: Skill Validity:**
   - `node scripts/validate-references.js` passes 100% (329 skills, all mirrors in sync).
   - `node scripts/validate-instructions.js` passes 100%.
3. **Gate C: Evaluation Correctness:**
   - Known-answer tests pass for Confusion Matrix, Brier score, ECE, Cohen's Kappa, and Fleiss' Kappa.
   - Zero-denominator protection verified ($0/0 \to 0$ with `zero_denominator` flags).
4. **Gate D: Evidence Integrity:**
   - 5-state epistemic verdicts properly differentiate `SUPPORTED` from `UNSUPPORTED`/`CONTRADICTED`.
   - Fabricated file paths and ghost packages (`ultravalidate`, etc.) are reliably caught.
5. **Gate E: Security & Redaction:**
   - Secret redaction sanitizes API keys and bearer tokens from error details and reports.
   - Fixture injection attempts do not compromise execution control flow.
6. **Gate F: Behavioral Certification:**
   - Every skill has executable behavioral tests testing positive and negative contracts.
7. **Gate G: Regression Protection:**
   - Non-masking safety gate blocks release whenever critical regressions occur, even if overall pass rate improves.
8. **Gate H: Release Decision:**
   - Full test suite passes; verified evidence recorded in `AI_RELIABILITY_CERTIFICATION_REPORT.md`.

---

## 7. Out of Scope

- Modifying existing external CLI commands or npm distribution wrappers.
- Deploying live cloud LLM APIs (all behavioral evaluations use deterministic mocks & clean worktree sandboxes).
- Modifying pre-existing unrelated skills or reviewer rules.

