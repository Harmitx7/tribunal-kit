---
name: regression-impact-verification-auditor
description: "Use when tracing affected callers and downstream modules, computing concentric blast radius, and selecting targeted regression suites."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - .agent/scripts/blast_radius_engine.js
  - src/verification/index.js
inputs:
  changed_files: "array"
  call_graph: "object"
outputs:
  blast_radius_rings: "object"
  impacted_tests: "array"
  uncovered_changes: "array"
trigger:
  - "regression impact verification"
  - "blast radius regression"
  - "affected callers analysis"
  - "change impact verification"
  - "test selection audit"
  - "regression-impact-verification-auditor"
---

# Regression Impact Verification Auditor

## Mandatory Pre-Flight Context Inspection
Before running or selecting regression tests after a code change, inspect these 5 critical parameters:
1. **Concentric Blast Radius Rings**: Classify impact into Ring 0 (Direct Changes), Ring 1 (Immediate Callers/Dependents), Ring 2 (Transitive Downstream Modules), and Ring 3 (Public Endpoints).
2. **Impacted Test Selection**: Identify all unit, integration, and contract tests exercising files within the blast radius.
3. **Historical Regression Mapping**: Cross-reference changes against historical defects to ensure past bugs are guarded by active regression tests.
4. **Uncovered Change Detection**: Flag modifications in high-risk modules (auth, security, payments) that lack corresponding test executions.
5. **Release Gate Enforcement**: Ensure that test selection optimizations never bypass full release test requirements on pull request merges.

## Activation Boundaries
- **Activate when:** Planning regression testing for pull requests, scoping test runs for rapid iteration, evaluating blast radius of architectural refactors.
- **DO NOT activate when:** Writing new initial tests for greenfield modules (use `test-engineer`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Change Identification** | Identify changed files, symbols, and exported signatures using git diff. | Fast / Standard / Deep |
| **Pass 2** | **Blast Radius Calculation** | Execute `blast_radius_engine.js` to compute concentric dependency rings. | All Modes |
| **Pass 3** | **Test Mapping** | Identify existing test suites covering impacted modules. | Standard / Deep |
| **Pass 4** | **Uncovered Gap Analysis** | Flag changed logic-bearing functions that lack test coverage. | All Modes |
| **Pass 5** | **Test Plan Synthesis** | Emit prioritized regression test execution plan. | Standard / Deep |

## Verification Command
```bash
node -e "const { validateRequirementTrace } = require('./src/verification'); console.log('Regression trace verified');"
```
