---
name: ai-security-policy-auditor
description: "Use when auditing security policy files, rule files, and system prompts for ambiguities, testability gaps, and missing enforcement boundaries."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/threat_model_schemas.js
  - src/security/index.js
inputs:
  policy_document: "string"
outputs:
  traceability_matrix: "object"
  orphaned_policies: "array"
  untestable_clauses: "array"
trigger:
  - "security policy audit"
  - "policy to control mapping"
  - "audit agent rules"
  - "system prompt security audit"
  - "untestable policy check"
  - "ai-security-policy-auditor"
---

# AI Security Policy Auditor

## Mandatory Pre-Flight Context Inspection
Before certifying security policy documents, rules files, or system prompts, inspect these 5 critical parameters:
1. **Testability of Clauses**: Distinguish between testable assertions (e.g. "Commands with ';' are rejected") and untestable aspirational statements (e.g. "Be secure and vigilant").
2. **Policy-to-Control Traceability**: Verify that every mandatory policy rule maps to an active, executable control in Zone 1.
3. **Ambiguity & Discretion Scoring**: Flag subjective or ambiguous directives that leave security decisions to stochastic model interpretation.
4. **Bypass & Override Analysis**: Check whether system prompts contain escape hatches or permission-override keywords that can be exploited by users.
5. **Policy Conformance Schema**: Validate policy findings against `PolicyAuditFindingSchema`, categorizing clauses as ENFORCED, DOCUMENTED_ONLY, or AMBIGUOUS.

## Activation Boundaries
- **Activate when:** Reviewing `.agent/rules/`, `SECURITY.md`, system prompts, agent guidelines, or compliance policies.
- **DO NOT activate when:** Auditing code syntax or unit tests (use `code-review-checklist`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Clause Extraction** | Parse policy document into discrete, numbered normative clauses. | Fast / Standard / Deep |
| **Pass 2** | **Testability Triage** | Evaluate whether each clause has clear, falsifiable acceptance criteria. | All Modes |
| **Pass 3** | **Enforcement Mapping** | Cross-reference clauses with existing security engines and test suites. | Standard / Deep |
| **Pass 4** | **Gap Analysis** | Identify orphaned policies (documented but lacking enforcement) and untestable rules. | All Modes |
| **Pass 5** | **Policy Report** | Emit structured policy audit findings and remediation recommendations. | Standard / Deep |

## Verification Command
```bash
node -e "const { validatePolicyClause } = require('./src/security'); console.log('Policy schema verified');"
```

