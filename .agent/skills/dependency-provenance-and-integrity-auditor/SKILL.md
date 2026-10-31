---
name: dependency-provenance-and-integrity-auditor
description: "Use when auditing lockfile integrity checksums, detecting lockfile poisoning attacks, and verifying SLSA build provenance attestations."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/package_integrity_engine.js
  - src/supply_chain/index.js
inputs:
  lockfile_data: "object"
  provenance_data: "object"
outputs:
  integrity_findings: "array"
  poisoning_findings: "array"
  slsa_verification_result: "object"
trigger:
  - "lockfile integrity audit"
  - "lockfile poisoning check"
  - "sri hash verification"
  - "slsa provenance check"
  - "unapproved registry detection"
  - "dependency-provenance-and-integrity-auditor"
---

# Dependency Provenance & Integrity Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing dependency provenance and integrity, inspect these 5 critical parameters:
1. **Subresource Integrity (SRI) Completeness**: Ensure all lockfile entries contain strong cryptographic checksums (`sha512` or `sha256`).
2. **Registry URL Validation**: Verify that every `resolved` URL points strictly to approved HTTPS registry domains.
3. **Unencrypted HTTP Prohibition**: Flag any package resolution over plain HTTP transport as an immediate critical security failure.
4. **SLSA Build Provenance Verification**: Validate builder identity, source repository commit, and attestation level against `ProvenanceSchema`.
5. **Cryptographic Tamper Evidence**: Compare declared hashes against authoritative registry metadata or physical artifact bytes.

## Activation Boundaries
- **Activate when:** Reviewing lockfile changes in PRs, verifying package tarball checksums, validating SLSA attestations, or preventing lockfile poisoning.
- **DO NOT activate when:** Auditing software bill of materials completeness (use `sbom-generation-and-validation-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Lockfile Schema Parsing** | Parse lockfile entries across v1, v2, and v3 formats into structured records. | Fast / Standard / Deep |
| **Pass 2** | **Checksum & SRI Inspection** | Audit presence and cryptographic strength of `integrity` fields. | All Modes |
| **Pass 3** | **Registry & Transport Audit** | Validate resolved endpoints against approved registry white-lists and require HTTPS. | Standard / Deep |
| **Pass 4** | **SLSA Attestation Verification** | Validate in-toto / SLSA provenance metadata and builder certificates. | All Modes |
| **Pass 5** | **Integrity Verdict Emission** | Synthesize findings under `V5_LOCKFILE_POISONING`, `V6_INTEGRITY_CHECKSUM_GAP`, or `V12_ARTIFACT_TAMPERING`. | Standard / Deep |

## Verification Command
```bash
node -e "const { PackageIntegrityEngine } = require('./src/supply_chain'); console.log('Package integrity engine operational');"
```

