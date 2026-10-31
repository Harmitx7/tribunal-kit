---
name: dependency-confusion-and-registry-security-auditor
description: "Use when detecting dependency confusion vulnerabilities, auditing un-scoped internal packages, and enforcing registry namespace isolation."
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
  internal_packages: "array"
  package_manifest: "object"
  npmrc_config: "string"
outputs:
  dependency_confusion_findings: "array"
  namespace_isolation_status: "string"
  registry_hardening_guide: "object"
trigger:
  - "dependency confusion audit"
  - "internal package collision"
  - "un-scoped private package"
  - "registry namespace isolation"
  - "npmrc registry routing"
  - "dependency-confusion-and-registry-security-auditor"
---

# Dependency Confusion & Registry Security Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing dependency confusion and registry security, inspect these 5 critical parameters:
1. **Un-Scoped Private Package Detection**: Identify internal proprietary packages declared without scope prefixes (`@scope/`).
2. **Public Registry Name Collision**: Check whether identical un-scoped package names exist on public registries (e.g. `npmjs.com`).
3. **Registry Priority & `.npmrc` Scoping**: Verify `.npmrc` configuration to ensure internal scopes route strictly to private registry endpoints.
4. **Semver Hijacking Prevention**: Prevent attackers from claiming internal package names publicly with inflated versions (e.g. `99.99.99`).
5. **Namespace Reservation**: Enforce reservation of internal namespaces or defensive placeholder publication on public registries.

## Activation Boundaries
- **Activate when:** Auditing monorepo package configurations, reviewing private package dependencies, or validating `.npmrc` registry routing.
- **DO NOT activate when:** Auditing lockfile hash integrity (use `dependency-provenance-and-integrity-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Internal Package Discovery** | Identify private and internal dependencies from manifests and monorepo workspaces. | Fast / Standard / Deep |
| **Pass 2** | **Scope Verification** | Check if all internal packages are governed by an organization scope prefix (`@org/`). | All Modes |
| **Pass 3** | **Registry Routing Inspection** | Audit `.npmrc` and `.yarnrc` configs for strict scope-to-registry bindings. | Standard / Deep |
| **Pass 4** | **Public Collision Testing** | Check for presence of un-scoped internal package names on public registry feeds. | All Modes |
| **Pass 5** | **Hardening & Isolation Emission**| Synthesize findings under `V4_DEPENDENCY_CONFUSION` with scoping migration plans. | Standard / Deep |

## Verification Command
```bash
node -e "const { MaliciousPackageEngine } = require('./src/supply_chain'); console.log('Dependency confusion check operational');"
```

