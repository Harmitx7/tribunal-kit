---
name: sbom-generation-and-validation-auditor
description: "Use when generating CycloneDX v1.5 and SPDX v2.3 Software Bills of Materials (SBOMs), validating schema completeness, and calculating component diffs."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/sbom_engine.js
  - src/supply_chain/index.js
inputs:
  components_inventory: "array"
  existing_sbom_doc: "object"
outputs:
  cyclonedx_sbom: "object"
  spdx_sbom: "object"
  sbom_validation_result: "object"
  sbom_diff_result: "object"
trigger:
  - "sbom generation"
  - "cyclonedx export"
  - "spdx validation"
  - "sbom diff audit"
  - "software bill of materials"
  - "sbom-generation-and-validation-auditor"
---

# SBOM Generation & Validation Auditor

## Mandatory Pre-Flight Context Inspection
Before generating or validating Software Bills of Materials, inspect these 5 critical parameters:
1. **Standard Specification Conformity**: Enforce strict conformance with **CycloneDX v1.5 JSON** or **SPDX v2.3 JSON** standards.
2. **Package URL (PURL) Completeness**: Ensure 100% of inventory items contain canonical, parseable Package URLs.
3. **Cryptographic Checksum Inclusion**: Embed SHA-256 and SHA-512 hashes within component entries for tamper-evident tracking.
4. **License Metadata Fidelity**: Conclude and declare normalized SPDX license identifiers for all documented packages.
5. **Release Delta Tracking (SBOM Diffing)**: Compare baseline vs target SBOMs to isolate newly introduced third-party components and version drifts.

## Activation Boundaries
- **Activate when:** Preparing release documentation, validating regulatory SBOM requirements, generating compliance manifests, or diffing dependencies.
- **DO NOT activate when:** Auditing software license policy compliance (use `license-compliance-and-policy-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Inventory Aggregation** | Collect resolved components, PURLs, dependency edges, and hashes. | Fast / Standard / Deep |
| **Pass 2** | **SBOM Document Generation** | Construct formatted CycloneDX v1.5 or SPDX v2.3 JSON document trees. | All Modes |
| **Pass 3** | **Schema & PURL Validation** | Validate candidate SBOM against structural schemas and verify PURL fields. | Standard / Deep |
| **Pass 4** | **Completeness & License Audit** | Check for missing components, unasserted licenses, or missing checksums. | All Modes |
| **Pass 5** | **SBOM Diff & Report Synthesis** | Output validated SBOM documents and diff breakdown against previous baseline. | Standard / Deep |

## Verification Command
```bash
node -e "const { SbomEngine } = require('./src/supply_chain'); console.log('SBOM engine operational');"
```

