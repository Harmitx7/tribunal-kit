---
name: ai-security-control-verifier
description: "Use when exercising claimed security controls using non-destructive negative test fixtures to verify active enforcement vs documented assertion."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/index.js
  - src/evaluation/agent_behavioral_testing_engine.js
inputs:
  control_id: "string"
  test_fixture: "object"
outputs:
  enforced: "boolean"
  bypass_possible: "boolean"
  evidence: "object"
trigger:
  - "verify security control"
  - "control enforcement test"
  - "security control verifier"
  - "negative security test"
  - "fail closed verification"
  - "ai-security-control-verifier"
---

# AI Security Control Verifier

## Mandatory Pre-Flight Context Inspection
Before declaring any security control as active and enforced, inspect these 5 critical parameters:
1. **Documented vs Enforced Boundary**: Distinguish between written policy (Zone 2) and deterministic code enforcement (Zone 1/Zone 0). A documented rule is NOT enforced without an executable check.
2. **Deterministic Negative Testing**: Exercise controls with negative fixtures designed to trigger boundary violations (e.g. path traversal, SSRF IP, prompt smuggler).
3. **Fail-Closed Verification**: Confirm that ambiguous, unparseable, or erroneous inputs trigger a secure default rejection rather than an unauthenticated pass.
4. **Epistemic Certainty ($E_0 < E_2/E_5$)**: Ensure natural language claims cannot override deterministic test execution results.
5. **Traceability Chain**: Verify the complete link: $\text{Threat} \to \text{Control} \to \text{Test} \to \text{Evidence}$.

## Activation Boundaries
- **Activate when:** Verifying pre-deploy security gates, testing new security features, validating compliance manifests, or conducting release certifications.
- **DO NOT activate when:** Triaging live production breach incidents (use `ai-security-incident-analyst`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Control Schema Audit** | Parse control specification against `SecurityControlSchema`. | Fast / Standard / Deep |
| **Pass 2** | **Executable Check Discovery** | Locate and verify the executable test script or boundary function referenced. | All Modes |
| **Pass 3** | **Negative Boundary Test** | Run non-destructive adversarial test fixtures against the target control. | Standard / Deep |
| **Pass 4** | **Fail-Closed Verification** | Pass malformed and edge-case inputs; assert proper exception handling and rejection. | All Modes |
| **Pass 5** | **Evidence Synthesis** | Emit verified finding or certification evidence with exit codes and timestamps. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_control_verifier.test.js
```

