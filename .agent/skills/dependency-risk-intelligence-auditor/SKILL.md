---
name: dependency-risk-intelligence-auditor
description: "Use when evaluating security advisories, vulnerability severities, EPSS exploit likelihoods, and transitive vulnerability risks across direct and transitive dependencies."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/vulnerability_intelligence_engine.js
  - src/supply_chain/index.js
inputs:
  manifest_path: "string"
  lockfile_path: "string"
  advisories: "array"
outputs:
  vulnerability_findings: "array"
  critical_vulnerabilities_count: "number"
  epss_prioritized_remediations: "array"
trigger:
  - "dependency vulnerability audit"
  - "known cve check"
  - "epss vulnerability scoring"
  - "cisa kev vulnerability"
  - "transitive vulnerability analysis"
  - "dependency-risk-intelligence-auditor"
---

# Dependency Risk Intelligence Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing dependency vulnerabilities, inspect these 5 critical parameters:
1. **Advisory Normalization**: Map multi-ecosystem vulnerability feeds (OSV, GHSA, CVE) into canonical `AdvisorySchema` entries.
2. **Deterministic Semver Evaluation**: Evaluate package versions against semver ranges using deterministic interval logic.
3. **EPSS & CISA KEV Prioritization**: Escalate vulnerabilities with active exploitation in the wild (CISA KEV) or high 30-day exploit probability (EPSS > 0.36).
4. **Feed Freshness & Offline Transparency**: Disclose advisory feed timestamps and report explicit feed status (`OK`, `OFFLINE_FALLBACK`, `UNAVAILABLE_FEED`).
5. **Non-Masking Safety Invariant**: Guarantee $\Delta\text{Critical} = 0$; never conceal, downgrade, or omit critical security advisories.

## Activation Boundaries
- **Activate when:** Scanning manifests and lockfiles for known CVEs, prioritizing patch order via EPSS/KEV, or evaluating transitive exposure.
- **DO NOT activate when:** Auditing raw shell execution sinks (use `agent-execution-safety-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Inventory Construction** | Parse project manifests into resolved component inventory with depth tags. | Fast / Standard / Deep |
| **Pass 2** | **Advisory Ingestion** | Ingest normalized advisory feeds and verify feed freshness and integrity. | All Modes |
| **Pass 3** | **Semver Range Evaluation** | Match component versions against advisory affected ranges. | Standard / Deep |
| **Pass 4** | **Exploitability Prioritization** | Rank vulnerabilities using CVSS score, EPSS probability, and CISA KEV tags. | All Modes |
| **Pass 5** | **Findings & Remediation Synthesis** | Emit structured `SupplyChainFindingSchema` records with precise upgrade recommendations. | Standard / Deep |

## Verification Command
```bash
node -e "const { VulnerabilityIntelligenceEngine } = require('./src/supply_chain'); console.log('Vulnerability engine operational');"
```

