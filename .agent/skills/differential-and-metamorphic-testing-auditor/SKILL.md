---
name: differential-and-metamorphic-testing-auditor
description: "Use when comparing candidate execution against independent reference implementations and verifying metamorphic input-output relations."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/differential_testing_engine.js
  - src/verification/index.js
inputs:
  candidate_fn: "function"
  reference_fn: "function"
  metamorphic_relation: "object"
outputs:
  differential_match: "boolean"
  deviations: "array"
  metamorphic_violations: "array"
trigger:
  - "differential testing"
  - "metamorphic testing"
  - "dual implementation comparison"
  - "metamorphic relation audit"
  - "oracle problem testing"
  - "differential-and-metamorphic-testing-auditor"
---

# Differential & Metamorphic Testing Auditor

## Mandatory Pre-Flight Context Inspection
Before conducting differential testing or verifying metamorphic relations, inspect these 5 critical parameters:
1. **The Oracle Problem**: When an exact ground-truth oracle is unavailable, use metamorphic relations across related inputs to detect defects.
2. **Dual-Implementation Comparison**: Compare candidate code against trusted baseline libraries, legacy implementations, or reference algorithms.
3. **Legitimate Nondeterminism**: Account for timestamp variations, floating-point rounding margins, and hash iteration ordering.
4. **Metamorphic Invariants**: Formulate proven relations such as Idempotence ($f(f(x)) = f(x)$), Additivity ($f(x) + f(y) = f(x+y)$), or Symmetry ($f(-x) = -f(x)$).
5. **Reproducible Counterexamples**: Record failing input pairs and reproduction seeds whenever a differential mismatch or metamorphic failure occurs.

## Activation Boundaries
- **Activate when:** Refactoring complex algorithms, optimizing computational performance, testing compilers/parsers, or verifying implementations where expected outputs cannot be manually hardcoded.
- **DO NOT activate when:** Verifying simple static constants (use `clean-code`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Relation Formulation** | Define metamorphic transformation and consistency relation checks. | Fast / Standard / Deep |
| **Pass 2** | **Reference Setup** | Wire candidate function and reference oracle into `runDifferentialTest`. | All Modes |
| **Pass 3** | **Execution Comparison** | Execute differential comparison across $N$ inputs with floating-point tolerance. | Standard / Deep |
| **Pass 4** | **Metamorphic Check** | Run `verifyMetamorphicRelation` to verify mathematical input-output properties. | All Modes |
| **Pass 5** | **Deviation Triage** | Report any functional discrepancies or metamorphic relation breaches. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_differential.test.js
```
