---
name: hallucination-detection-auditor
description: "Use when auditing agent reviews, claims, and generated findings to detect hallucinations, fabricated files, stale lines, invented APIs, ghost npm/Python packages, or tool output contradictions."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - audit-and-fix
  - vulnerability-scanner
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/evidence_verifier.js
  - src/evaluation/hallucination_detection_auditor.js
inputs:
  findings: "array"
  repo_root: "string"
outputs:
  claim_verdicts: "array"
  hallucinations_detected: "number"
  entailment_rate: "number"
trigger:
  - "hallucination audit"
  - "detect hallucination"
  - "verify source claims"
  - "ghost package audit"
  - "fabricated code inspection"
  - "hallucination detection auditor"
---

# Hallucination Detection Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing findings for hallucinations, inspect these 5 critical parameters:
1. **Source File Existence**: Verify every cited file path directly against the repository filesystem on disk using `statSync`.
2. **Line Boundary Integrity**: Verify that cited line numbers are within the valid physical line count of the target file.
3. **Ghost Package Patterns**: Check imported packages against known fabricated libraries (`ultravalidate`, `super-jwt-checker`, etc.) and official registry catalogs.
4. **Tool Output Consistency**: Confirm that claims asserting test success or clean builds are supported by actual zero exit codes (`exit_code === 0`).
5. **Epistemic 5-State Stratification**: Assign one of 5 definitive verdicts: `SUPPORTED`, `CONTRADICTED`, `UNSUPPORTED`, `PARTIALLY_SUPPORTED`, or `UNVERIFIABLE`.

## Activation Boundaries
- **Activate when:** Reviewing findings emitted by automated AI agents, auditing pull-request comments for ghost dependencies, checking whether cited lines exist, or assessing factual claim entailment.
- **DO NOT activate when:** Running syntax linting where code is verified by the compiler alone, or when performing general stylistic reviews.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Deconstruct** | Parse findings into atomic assertions containing target files, line numbers, and impact claims. | Fast / Standard / Deep |
| **Pass 2** | **Factual Grounding** | Cross-reference cited file paths and line ranges against disk via `evidence_verifier`. | Standard / Deep |
| **Pass 3** | **Package & API Scan** | Search dependencies against known ghost packages and invented stdlib methods (`Array.prototype.unique`). | All Modes |
| **Pass 4** | **Tool Entailment** | Validate that execution claims match actual compiler and test exit codes. | All Modes |
| **Pass 5** | **Verdict Assignment** | Emit explicit 5-state verdicts and calculate overall finding entailment rate. | Standard / Deep |

## The 5-State Epistemic Verdict System
- **`SUPPORTED`:** Target file and lines exist on disk; cited code matches exactly; assertion is entailed by the evidence. Entailment score: `1.0`.
- **`CONTRADICTED`:** File is missing, line numbers are stale/out-of-bounds, dependency is a known ghost package, or cited tool exited non-zero when claim asserted success. Entailment score: `0.0`.
- **`UNSUPPORTED`:** The finding makes a concrete vulnerability or performance claim but provides no location, file path, or reproducible proof. Entailment score: `0.0`.
- **`PARTIALLY_SUPPORTED`:** Some cited locations exist and match, but other cited evidence is missing or inconclusive. Entailment score: proportional ($0.0 < s < 1.0$).
- **`UNVERIFIABLE`:** Target relies on external environment states or private credentials that cannot be resolved deterministically on disk. Entailment score: `0.5`.

## Verification Command
```bash
npx jest test/unit/hallucination_detection_auditor.test.js
```
