---
name: mutation-testing-auditor
description: "Use when injecting synthetic AST mutations (arithmetic, relational, logical, literal), measuring mutant kill rate, and identifying weak or vacuous tests."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/mutation_testing_engine.js
  - src/verification/index.js
inputs:
  target_code: "string"
  test_suite: "function"
outputs:
  mutation_score: "number"
  killed_mutants: "number"
  survived_mutants: "array"
trigger:
  - "mutation testing audit"
  - "kill mutants"
  - "mutation score"
  - "surviving mutant detector"
  - "test effectiveness audit"
  - "mutation-testing-auditor"
---

# Mutation Testing Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing test suite effectiveness with mutation testing, inspect these 5 critical parameters:
1. **Assertion Quality over Coverage**: 100% line coverage does not prove correctness; if an inverted conditional survives, tests are blind to bugs.
2. **Mutation Operator Selection**: Apply diverse operator mutations covering arithmetic (`+`/`-`), relational (`>`/`<=`), equality (`===`/`!==`), logical (`&&`/`||`), and boolean literals.
3. **Surviving Mutant Triage**: Treat surviving mutants as high-risk latent bugs that expose missing assertions.
4. **Equivalent Mutant Awareness**: Distinguish semantically equivalent mutants from genuine test gaps.
5. **Execution Guardrails**: Enforce per-mutant test execution timeouts to prevent infinite loops in mutated loops.

## Activation Boundaries
- **Activate when:** Evaluating test suite assertion strength, auditing mission-critical domain logic, reviewing high-risk pull requests, or verifying certification gates.
- **DO NOT activate when:** Auditing UI style formatting (use `frontend-specialist`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Mutant Generation** | Parse source code and generate single-point mutants using `generateMutants`. | Fast / Standard / Deep |
| **Pass 2** | **Test Execution** | Execute test harness against each mutant in memory using `evaluateMutants`. | All Modes |
| **Pass 3** | **Outcome Classification** | Classify mutants into `KILLED` (test failed/caught) and `SURVIVED` (test passed/blind). | Standard / Deep |
| **Pass 4** | **Score Calculation** | Calculate mutation score: $\text{KillRate} = \frac{\text{Killed}}{\text{Killed} + \text{Survived}}$. | All Modes |
| **Pass 5** | **Remediation & Hardening** | Propose targeted assertions that explicitly kill surviving mutants. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_mutation.test.js
```
