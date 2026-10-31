---
name: malicious-package-and-typosquatting-auditor
description: "Use when detecting malicious package lifecycle scripts (preinstall, postinstall) and identifying typosquatting attacks against popular open-source dependencies."
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
  candidate_packages: "array"
  popular_packages_catalog: "array"
outputs:
  typosquat_findings: "array"
  suspicious_hook_findings: "array"
  risk_verdict: "string"
trigger:
  - "typosquatting detection"
  - "malicious package audit"
  - "lifecycle script inspection"
  - "preinstall hook risk"
  - "postinstall command check"
  - "malicious-package-and-typosquatting-auditor"
---

# Malicious Package & Typosquatting Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing packages for malicious scripts or typosquatting, inspect these 5 critical parameters:
1. **Zero Execution of Untrusted Code**: Statically parse package manifests and scripts; never execute `preinstall`, `postinstall`, or package commands.
2. **Levenshtein & Homoglyph Analysis**: Measure edit distance and homoglyph substitutions against high-frequency legitimate packages.
3. **Suspicious Command Pattern Matching**: Detect shell execution (`node -e`, `powershell -enc`), remote fetching (`curl`, `wget`), and token exfiltration.
4. **Hyphen & Prefix Confusion**: Flag packages omitting hyphens (e.g. `crossenv` vs `cross-env`) or using deceptive suffixes.
5. **Deterministic Finding Generation**: Emit actionable `SupplyChainFindingSchema` records with exact edit distances and suspicious script excerpts.

## Activation Boundaries
- **Activate when:** Inspecting newly introduced packages, reviewing pull request dependencies, verifying install-time lifecycle hooks, or preventing typosquatting.
- **DO NOT activate when:** Auditing build pipeline runners (use `build-and-ci-supply-chain-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Manifest Ingestion** | Extract package names, versions, and lifecycle scripts (`scripts` block). | Fast / Standard / Deep |
| **Pass 2** | **Static Hook Inspection** | Statically evaluate `preinstall`, `install`, and `postinstall` commands against danger patterns. | All Modes |
| **Pass 3** | **Typosquatting Distance Matching** | Calculate Levenshtein distances against popular open-source package catalog. | Standard / Deep |
| **Pass 4** | **Homoglyph & Deception Check** | Analyze character substitutions, hyphen omissions, and scope confusion. | All Modes |
| **Pass 5** | **Evidence & Verdict Synthesis** | Generate structured findings with verified evidence and containment recommendations. | Standard / Deep |

## Verification Command
```bash
node -e "const { MaliciousPackageEngine } = require('./src/supply_chain'); console.log('Malicious package engine operational');"
```

