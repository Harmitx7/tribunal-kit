---
name: build-and-ci-supply-chain-auditor
description: "Use when auditing CI/CD pipelines, GitHub Actions workflow steps for unpinned mutable references, and build-time isolation parameters."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/malicious_package_engine.js
  - src/supply_chain/index.js
inputs:
  workflow_files: "array"
outputs:
  unpinned_actions_findings: "array"
  pipeline_permission_findings: "array"
  ci_risk_summary: "object"
trigger:
  - "ci cd supply chain audit"
  - "unpinned github action"
  - "github action commit sha pin"
  - "pipeline security audit"
  - "workflow permission check"
  - "build-and-ci-supply-chain-auditor"
---

# Build & CI Supply Chain Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing build and CI/CD pipelines, inspect these 5 critical parameters:
1. **Full Commit SHA Action Pinning**: Ensure 100% of third-party GitHub Actions in `.github/workflows/` are pinned to immutable 40-character commit SHAs.
2. **Tag Mutation Resistance**: Eliminate mutable branch references (`@main`, `@master`) and mutable tag references (`@v4`, `@v2.0`).
3. **Least-Privilege Pipeline Permissions**: Verify explicit `permissions:` blocks restricting `GITHUB_TOKEN` to read-only defaults (`contents: read`).
4. **Secret Exposure Prevention**: Ensure environment variables and secrets are never echoed, logged, or exported into untrusted build steps.
5. **Build Isolation & Hermetic Environments**: Verify that build scripts do not perform unmetered external downloads during execution.

## Activation Boundaries
- **Activate when:** Reviewing `.github/workflows/` YAML files, auditing pipeline security, hardening release workflows, or enforcing OpenSSF Scorecard rules.
- **DO NOT activate when:** Auditing package lifecycle hooks (use `malicious-package-and-typosquatting-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Workflow Discovery** | Discover and read all workflow definitions in `.github/workflows/`. | Fast / Standard / Deep |
| **Pass 2** | **Action Step Parsing** | Extract all `uses:` directives and determine whether references are SHA-pinned. | All Modes |
| **Pass 3** | **Permission Block Audit** | Check top-level and job-level `permissions` definitions against least privilege. | Standard / Deep |
| **Pass 4** | **Secret Transmission Analysis** | Trace where secrets and repository tokens are passed into third-party steps. | All Modes |
| **Pass 5** | **Findings & Hardening Synthesis** | Emit findings for `V11_UNPINNED_CI_ACTION` with precise SHA commit replacements. | Standard / Deep |

## Verification Command
```bash
node -e "const { MaliciousPackageEngine } = require('./src/supply_chain'); console.log('CI auditor engine operational');"
```

