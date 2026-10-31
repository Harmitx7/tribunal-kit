---
name: design-by-contract-auditor
description: "Use when evaluating preconditions, postconditions, and invariants, verifying trust boundary contracts, and preventing contract violations."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/contract_engine.js
  - src/verification/index.js
inputs:
  function_signature: "string"
  contract_definition: "object"
outputs:
  contract_status: "string"
  precondition_violations: "array"
  invariant_violations: "array"
trigger:
  - "design by contract"
  - "precondition audit"
  - "postcondition verification"
  - "invariant check"
  - "contract violation detector"
  - "design-by-contract-auditor"
---

# Design by Contract Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing function contracts or injecting runtime contract assertions, inspect these 5 critical parameters:
1. **Precondition Obligation**: Check whether callers satisfy required argument bounds, non-null guarantees, and format constraints ($P_{\text{pre}}$).
2. **Postcondition Guarantee**: Verify that functions return values satisfying documented ranges, formats, and state changes ($Q_{\text{post}}$).
3. **Class & Module Invariants**: Ensure invariants hold unconditionally before method invocation and after method completion ($I_{\text{inv}}$).
4. **Trust Boundary Validation**: Enforce that validation occurs strictly at external input boundaries rather than deep in internal helper routines.
5. **Non-Disruptive Assertion Rule**: Do not introduce contract assertions that unexpectedly reject valid production workloads or break existing callers.

## Activation Boundaries
- **Activate when:** Designing core business logic interfaces, auditing boundary checks against null/undefined, reviewing financial/auth state mutations, or hardening domain models.
- **DO NOT activate when:** Auditing build pipeline configs (use `cicd-pro`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Interface Inspection** | Inspect method signatures and docstrings to extract implicit and explicit assumptions. | Fast / Standard / Deep |
| **Pass 2** | **Boundary Gap Scan** | Run `auditContractCompleteness` to identify missing zero-division checks or null guards. | All Modes |
| **Pass 3** | **Executable Contract Wrap** | Wrap functions using `withContract` with `requires`, `ensures`, and `checkInvariant`. | Standard / Deep |
| **Pass 4** | **Violation Diagnostic Test** | Test with invalid inputs; verify that `ContractViolationError` is thrown with exact context. | All Modes |
| **Pass 5** | **Audit Synthesis** | Emit contract status report and recommend contract assertions. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_contract.test.js
```
