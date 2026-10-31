---
name: supply-chain-policy-and-exception-auditor
description: "Use when defining, enforcing, and auditing organizational supply chain governance policies, approval boundaries, and time-bound exceptions."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/supply_chain/component_inventory_schemas.js
  - src/supply_chain/license_compliance_engine.js
  - src/supply_chain/index.js
inputs:
  governance_policy: "object"
  audit_results: "object"
outputs:
  policy_compliance_status: "string"
  unauthorized_exceptions: "array"
  governance_gate_verdict: "string"
trigger:
  - "supply chain policy enforcement"
  - "governance approval boundary"
  - "time-bound exception audit"
  - "supply chain compliance gate"
  - "policy exception lifecycle"
  - "supply-chain-policy-and-exception-auditor"
---

# Supply Chain Policy & Exception Auditor

## Mandatory Pre-Flight Context Inspection
Before enforcing supply chain governance policies, inspect these 5 critical parameters:
1. **Explicit Policy Rule Contracts**: Formalize organizational rules governing permitted licenses, maximum allowed vulnerability severities, and minimum SLSA levels.
2. **Authorized Approver Verification**: Validate that every active exception is signed by a designated security or compliance authority.
3. **Strict Expiration Enforcement**: Flag expired exceptions immediately as blocking compliance violations without grace periods.
4. **Audit Trail Accountability**: Maintain an immutable record of exception justifications, scopes, approvers, and review intervals.
5. **Human Gate Enforcement**: Require explicit human sign-off before releasing software containing acknowledged supply chain risks.

## Activation Boundaries
- **Activate when:** Enforcing pre-deploy supply chain gates, evaluating compliance waivers, auditing expired exceptions, or defining governance baselines.
- **DO NOT activate when:** Statically analyzing lifecycle hooks in code (use `malicious-package-and-typosquatting-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Policy Ingestion** | Ingest `LicensePolicySchema` and governance rules (max severity, SLSA level). | Fast / Standard / Deep |
| **Pass 2** | **Exception Extraction** | Extract all active exception declarations and parse validity expiration dates. | All Modes |
| **Pass 3** | **Expiration & Scope Audit** | Identify expired exceptions, over-scoped wildcards, or unauthorized approvers. | Standard / Deep |
| **Pass 4** | **Gate Rule Evaluation** | Check full audit findings against policy thresholds (zero Critical/High CVEs). | All Modes |
| **Pass 5** | **Governance Gate Decision** | Output definitive release gate verdict (`PASS`, `FAIL`, `BLOCKED`, `INCONCLUSIVE`). | Standard / Deep |

## Verification Command
```bash
node -e "const { LicensePolicySchema } = require('./src/supply_chain'); console.log('Policy schema operational');"
```

