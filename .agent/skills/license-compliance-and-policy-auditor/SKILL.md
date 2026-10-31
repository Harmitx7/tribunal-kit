---
name: license-compliance-and-policy-auditor
description: "Use when normalizing SPDX license identifiers, evaluating permissive versus copyleft policies, analyzing dual-licensing, and auditing compliance exceptions."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/license_compliance_engine.js
  - src/supply_chain/index.js
inputs:
  components_inventory: "array"
  license_policy: "object"
outputs:
  license_findings: "array"
  prohibited_licenses_count: "number"
  exception_audit_summary: "object"
trigger:
  - "license compliance audit"
  - "spdx license normalization"
  - "copyleft license check"
  - "dual licensing analysis"
  - "license exception verification"
  - "license-compliance-and-policy-auditor"
---

# License Compliance & Policy Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing license compliance, inspect these 5 critical parameters:
1. **SPDX Identifier Normalization**: Translate non-standard and legacy license strings into canonical SPDX License Identifiers.
2. **Policy Tier Classification**: Categorize components into Permissive, Weak Copyleft, Strong Copyleft, or Prohibited tiers.
3. **Copyleft Contamination Prevention**: Prohibit viral copyleft licenses (e.g. AGPL-3.0, GPL-3.0, SSPL) in proprietary and commercial software.
4. **Dual-Licensing Expression Evaluation**: Disentangle disjunctive (`OR`) permissive options from conjunctive (`AND`) obligations.
5. **Exception Lifecycle Audit**: Validate approved exceptions, ensuring they are documented, signed by authorized stewards, and non-expired.

## Activation Boundaries
- **Activate when:** Reviewing new dependencies for license compatibility, auditing pre-release commercial compliance, or checking license exceptions.
- **DO NOT activate when:** Auditing code vulnerability risks (use `dependency-risk-intelligence-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **License Extraction** | Extract declared and concluded license strings from manifests and lockfiles. | Fast / Standard / Deep |
| **Pass 2** | **SPDX Normalization** | Map raw strings through canonical SPDX alias tables and expression parsers. | All Modes |
| **Pass 3** | **Tier & Expression Audit** | Classify licenses against organizational policy tiers and evaluate AND/OR operators. | Standard / Deep |
| **Pass 4** | **Exception Verification** | Match flagged components against active, non-expired approved exceptions. | All Modes |
| **Pass 5** | **Compliance Verdict Emission** | Output structured findings for `V8_LICENSE_VIOLATION` with substitution advice. | Standard / Deep |

## Verification Command
```bash
node -e "const { LicenseComplianceEngine } = require('./src/supply_chain'); console.log('License compliance engine operational');"
```

