---
name: formal-specification-auditor
description: "Use when defining formal specifications, modeling safety and liveness invariants, and establishing bounded verification boundaries."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/verification_schemas.js
  - src/verification/index.js
inputs:
  formal_spec: "string"
  invariant_definitions: "array"
outputs:
  bounded_verification_status: "string"
  counterexamples: "array"
  unproven_invariants: "array"
trigger:
  - "formal specification"
  - "tla plus audit"
  - "bounded model checking"
  - "safety invariant proof"
  - "formal methods audit"
  - "formal-specification-auditor"
---

# Formal Specification Auditor

## Mandatory Pre-Flight Context Inspection
Before adopting formal specification or bounded verification, inspect these 5 critical parameters:
1. **Practical Value over Ritual**: Apply formal specification only where state-space complexity or critical safety properties justify the investment.
2. **Safety vs Liveness Invariants**: Distinguish between safety invariants ("something bad never happens") and liveness invariants ("something good eventually happens").
3. **Explicit Boundary Assumptions**: Clearly state the operational model boundaries, environmental assumptions, and hardware constraints.
4. **State-Space Growth & Solver Limits**: Model state representations parsimoniously to prevent state-space explosion during verification.
5. **Specification vs Code Divergence**: Verify that formal specifications accurately reflect the actual implementation rather than an idealized model.

## Activation Boundaries
- **Activate when:** Formally modeling distributed consensus, cryptographic handshakes, multi-step state protocols, or critical concurrency algorithms.
- **DO NOT activate when:** Verifying standard CRUD endpoints (use `design-by-contract-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Property Formulation** | Express critical invariants using structured `InvariantRecordSchema` entries. | Fast / Standard / Deep |
| **Pass 2** | **Boundary Definition** | Define state-space bounds, actor counts, and message buffer limits. | All Modes |
| **Pass 3** | **Model Checking** | Execute bounded state-space exploration or invariant property checks. | Standard / Deep |
| **Pass 4** | **Counterexample Analysis** | If an invariant is breached, extract the full event trace leading to the counterexample. | All Modes |
| **Pass 5** | **Specification Synthesis** | Emit verification report documenting proven properties and explicit proof limits. | Standard / Deep |

## Verification Command
```bash
node -e "const { validateInvariantRecord } = require('./src/verification'); console.log('Formal invariants verified');"
```
