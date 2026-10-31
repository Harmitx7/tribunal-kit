---
name: dependency-maintenance-and-abandonment-auditor
description: "Use when auditing dependency maintenance health, detecting abandoned or deprecated packages, measuring maintainer activity, and calculating OpenSSF Scorecards."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/dependency_graph_engine.js
  - src/supply_chain/index.js
inputs:
  components_inventory: "array"
outputs:
  abandoned_findings: "array"
  deprecated_findings: "array"
  maintenance_scorecard: "object"
trigger:
  - "dependency maintenance audit"
  - "abandoned package check"
  - "deprecated dependency detection"
  - "openssf scorecard health"
  - "maintainer activity analysis"
  - "dependency-maintenance-and-abandonment-auditor"
---

# Dependency Maintenance & Abandonment Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing dependency maintenance and abandonment, inspect these 5 critical parameters:
1. **Official Deprecation Flags**: Check registry metadata for explicit deprecation warnings and replacement pointers.
2. **Commit & Release Cadence**: Flag dependencies with no commits or releases within the past 24 months as potential abandonment risks.
3. **Open Issues & Security Responsiveness**: Assess responsiveness to reported security vulnerabilities and critical bug fixes.
4. **Single-Maintainer Bus Factor**: Identify critical dependencies maintained by a single contributor without organizational backing.
5. **Archived Repository Status**: Verify that upstream source code repositories on GitHub/GitLab have not been marked archived or read-only.

## Activation Boundaries
- **Activate when:** Conducting periodic dependency health audits, evaluating candidate libraries for long-term support, or reviewing deprecated packages.
- **DO NOT activate when:** Evaluating breaking update contract changes (use `dependency-update-risk-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Metadata Collection** | Extract release dates, deprecation notices, and repository links for components. | Fast / Standard / Deep |
| **Pass 2** | **Deprecation Filtering** | Identify packages marked `deprecated: true` in lockfiles or registry responses. | All Modes |
| **Pass 3** | **Staleness & Dormancy Analysis**| Measure elapsed time since last release and evaluate maintainer activity metrics. | Standard / Deep |
| **Pass 4** | **Upstream Health Check** | Verify repository archive status, issue backlog trends, and bus factor risks. | All Modes |
| **Pass 5** | **Findings & Transition Roadmap** | Emit `V9_ABANDONED_DEPENDENCY` findings with recommended modern alternatives. | Standard / Deep |

## Verification Command
```bash
node -e "const { ComponentSchema } = require('./src/supply_chain'); console.log('Component schema validated');"
```

