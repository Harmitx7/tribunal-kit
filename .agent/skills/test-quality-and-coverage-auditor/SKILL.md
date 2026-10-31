---
name: test-quality-and-coverage-auditor
description: "Use when evaluating assertion strength, detecting tautological tests, auditing error-path and boundary coverage, and flagging brittle selectors."
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
  test_files: "array"
  coverage_report: "object"
outputs:
  test_quality_score: "number"
  weak_assertions: "array"
  missing_negative_tests: "array"
trigger:
  - "test quality audit"
  - "tautological test detector"
  - "weak assertion check"
  - "assertion strength auditor"
  - "negative test coverage audit"
  - "test-quality-and-coverage-auditor"
---

# Test Quality & Coverage Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing test suites for assertion strength and quality, inspect these 5 critical parameters:
1. **Tautological Assertion Detection**: Flag tests that assert vacuous conditions (e.g. `expect(1).toBe(1)`, `expect(res).toBeDefined()`, or `expect(x === x).toBe(true)`).
2. **Behavioral vs Implementation Testing**: Verify that tests assert observable behavioral contracts rather than internal private implementation details.
3. **Negative & Error Path Coverage**: Ensure tests exercise failure conditions, thrown exceptions, boundary inputs, and network timeouts.
4. **Fixture Isolation & Leakage**: Verify that test cases do not share mutable globals, leak database rows, or leave unclosed server handles.
5. **Mutation Kill Verification**: Verify whether tests actually fail when logic mutations are injected into production code.

## Activation Boundaries
- **Activate when:** Reviewing pull request test suites, auditing low-value coverage inflation, triaging flaky tests, or preparing pre-deploy quality gates.
- **DO NOT activate when:** Analyzing runtime CPU profiles (use `performance-profiling`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Assertion Scan** | Parse test files and identify empty tests, missing assertions, or trivial truthy assertions. | Fast / Standard / Deep |
| **Pass 2** | **Error Path Audit** | Cross-reference try/catch blocks and error responses with test assertions. | All Modes |
| **Pass 3** | **Mutation Sampling** | Run mutation testing sample on critical functions to test assertion sensitivity. | Standard / Deep |
| **Pass 4** | **Isolation Check** | Inspect beforeEach/afterEach hooks for proper state reset and handle cleanup. | All Modes |
| **Pass 5** | **Quality Scorecard** | Emit test quality report with actionable recommendations to harden assertions. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_mutation.test.js
```
