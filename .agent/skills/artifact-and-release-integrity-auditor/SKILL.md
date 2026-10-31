---
name: artifact-and-release-integrity-auditor
description: "Use when verifying distribution tarballs, binary checksum manifests, release signatures, and protecting against build-tampering attacks."
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
  release_artifacts: "array"
  checksums_manifest: "string"
  signature_bundle: "string"
outputs:
  artifact_verification_results: "array"
  hash_mismatches: "array"
  release_certification_status: "string"
trigger:
  - "artifact release integrity"
  - "checksum manifest verification"
  - "release signature check"
  - "build tampering detection"
  - "binary distribution audit"
  - "artifact-and-release-integrity-auditor"
---

# Artifact & Release Integrity Auditor

## Mandatory Pre-Flight Context Inspection
Before certifying distribution artifacts and releases, inspect these 5 critical parameters:
1. **Cryptographic Checksum Verification**: Verify that binary and tarball SHA-256 hashes exactly match values declared in signed manifests (`SHA256SUMS`).
2. **Timing-Safe Digest Comparisons**: Perform hash comparisons using constant-time evaluation (`crypto.timingSafeEqual`) to prevent timing side-channels.
3. **Reproducible Build Alignment**: Compare artifacts built in isolated CI against local artifacts to detect non-deterministic build injection.
4. **Signature & Key Authenticity**: Validate release signatures against trusted, rotated public keys or Sigstore Cosign certificates.
5. **Release Discrepancy Prevention**: Ensure published release assets match the exact source commit tag without uncommitted patches.

## Activation Boundaries
- **Activate when:** Preparing production release distributions, verifying binary assets, signing releases, or auditing published npm packages.
- **DO NOT activate when:** Auditing raw package dependencies in source (use `dependency-risk-intelligence-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Artifact Collection** | Collect compiled binaries, distribution tarballs, and corresponding manifest files. | Fast / Standard / Deep |
| **Pass 2** | **Hash Computation** | Compute cryptographic SHA-256 and SHA-512 hashes for all collected artifacts. | All Modes |
| **Pass 3** | **Manifest & Digest Audit** | Compare computed digests against declared `SHA256SUMS` using timing-safe comparisons. | Standard / Deep |
| **Pass 4** | **Signature & Key Verification**| Verify cryptographic signatures against trusted public release certificates. | All Modes |
| **Pass 5** | **Release Verdict Emission** | Emit `V12_ARTIFACT_TAMPERING` findings on hash mismatch or certify clean release. | Standard / Deep |

## Verification Command
```bash
node -e "const { verifySriHash } = require('./src/supply_chain'); console.log('Artifact integrity engine operational');"
```

