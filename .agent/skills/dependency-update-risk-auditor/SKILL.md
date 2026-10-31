---
name: dependency-update-risk-auditor
description: "Use when evaluating risks associated with dependency upgrades, major version breaking changes, behavioral diffs, and version drift."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/dependency_graph_engine.js
  - src/supply_chain/sbom_engine.js
  - src/supply_chain/index.js
inputs:
  current_manifest: "object"
  target_manifest: "object"
outputs:
  breaking_changes_risk: "object"
  version_drift_findings: "array"
  update_recommendations: "array"
trigger:
  - "dependency update audit"
  - "version drift check"
  - "major version upgrade risk"
  - "dependency upgrade blast radius"
  - "breaking changes analysis"
  - "dependency-update-risk-auditor"
---

# Dependency Update Risk Auditor

## Mandatory Pre-Flight Context Inspection
Before approving dependency upgrades, inspect these 5 critical parameters:
1. **Semver Leap Severity**: Classify updates into Major (breaking), Minor (features), and Patch (fixes) tiers.
2. **Transitive Blast Radius Delta**: Measure how many downstream transitive packages are added, removed, or upgraded.
3. **API Contract Compatibility**: Identify deprecated APIs and breaking signatures between baseline and candidate versions.
4. **Behavioral Invariant Preservation**: Ensure existing regression suites and property tests pass without relaxing assertions.
5. **Lockfile Drift Consistency**: Verify that updating a direct dependency does not introduce unexpected version drifts across unrelated trees.

## Activation Boundaries
- **Activate when:** Evaluating automated dependency bump PRs (e.g. Dependabot, Renovate), migrating to major library versions, or managing version drift.
- **DO NOT activate when:** Analyzing package abandonments (use `dependency-maintenance-and-abandonment-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Delta Identification** | Diff baseline manifest and lockfile against candidate versions. | Fast / Standard / Deep |
| **Pass 2** | **Semver Classification** | Categorize version changes into Patch, Minor, and Major breaking updates. | All Modes |
| **Pass 3** | **Transitive Impact Graphing** | Calculate transitive blast radius and fan-out impact across dependents. | Standard / Deep |
| **Pass 4** | **Changelog & Advisory Cross-Check** | Audit release notes for breaking changes, migration guides, and fixed CVEs. | All Modes |
| **Pass 5** | **Update Risk Synthesis** | Output recommendation matrix with safe update ordering and test requirements. | Standard / Deep |

## Verification Command
```bash
node -e "const { DependencyGraph } = require('./src/supply_chain'); console.log('Dependency graph engine operational');"
```

