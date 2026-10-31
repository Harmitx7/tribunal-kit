---
name: property-based-testing-engineer
description: "Use when deriving general behavioral invariants, generating test cases across broad input domains with deterministic seeds, and minimizing counterexamples via shrinking."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/property_testing_engine.js
  - src/verification/index.js
inputs:
  property_fn: "function"
  generators: "object"
  runs: "number"
outputs:
  property_held: "boolean"
  tested_inputs_count: "number"
  shrunk_counterexample: "object"
trigger:
  - "property based testing"
  - "arbitrary generator"
  - "invariant property test"
  - "counterexample shrinking"
  - "quickcheck fastcheck"
  - "property-based-testing-engineer"
---

# Property-Based Testing Engineer

## Mandatory Pre-Flight Context Inspection
Before writing or executing property-based tests, inspect these 5 critical parameters:
1. **General Behavioral Invariants**: Formulate universally quantified properties (e.g. $\forall x, f(x) \ge 0$ or $\forall arr, \text{sort}(\text{sort}(arr)) = \text{sort}(arr)$).
2. **Input Domain Constraints**: Construct realistic arbitrary generators with appropriate bounds, character sets, and data shapes.
3. **Boundary Condition Injection**: Ensure generators explicitly test boundary values ($0, -1, 1, \text{NaN}, \text{null}, \text{""}, \text{MAX\_INT}$).
4. **Deterministic Reproducibility**: Use a fixed PRNG seed (or record seed value) so that discovered counterexamples are 100% reproducible.
5. **Systematic Shrinking**: Verify that failing counterexamples are automatically minimized to the smallest failing case.

## Activation Boundaries
- **Activate when:** Verifying mathematical algorithms, encoders/decoders, serializers/deserializers, parsers, state machines, or data structures.
- **DO NOT activate when:** Writing simple single-case smoke tests (use `e2e-smoke-testing`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Invariant Formulation** | Express target specification as an executable property function returning boolean. | Fast / Standard / Deep |
| **Pass 2** | **Generator Composition** | Select composable arbitraries from `arb` (`integer`, `string`, `array`, `boolean`). | All Modes |
| **Pass 3** | **Execution Run** | Execute property function over $N$ runs (e.g. 100 runs) using `assertProperty`. | Standard / Deep |
| **Pass 4** | **Counterexample Shrinking** | If property fails, automatically shrink counterexample to minimal failing input. | All Modes |
| **Pass 5** | **Regression Case Generation**| Output minimal counterexample as a deterministic unit test to prevent regression. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_property.test.js
```
