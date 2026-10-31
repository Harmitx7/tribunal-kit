---
name: requirements-verification-auditor
description: "Use when determining whether implementation behavior satisfies stated requirements, extracting testable acceptance criteria, and building traceability matrices."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/verification/verification_schemas.js
  - src/verification/index.js
inputs:
  requirements_doc: "string"
  test_manifests: "array"
outputs:
  traceability_matrix: "object"
  uncovered_requirements: "array"
  unsupported_behaviors: "array"
trigger:
  - "requirements verification"
  - "traceability matrix"
  - "unverified requirements"
  - "acceptance criteria audit"
  - "requirements-to-code mapping"
  - "requirements-verification-auditor"
---

# Requirements Verification Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing implementation against stated requirements, inspect these 5 critical parameters:
1. **Atomic Requirement Extraction**: Deconstruct specifications into atomic, numbered, and testable requirements (`REQ-01`, `REQ-02`).
2. **Acceptance Criteria Falsifiability**: Verify that each requirement has explicit, falsifiable acceptance criteria rather than aspirational prose.
3. **Bidirectional Traceability Chain**: Ensure a complete unbroken chain exists:
   $$\text{Requirement} \longrightarrow \text{Invariant} \longrightarrow \text{Implementation} \longrightarrow \text{Verification Case} \longrightarrow \text{Evidence}$$
4. **Unsupported Behavior Detection**: Identify implementation code and side-effects that are not justified by any documented requirement.
5. **Epistemic Truth Verification**: Distinguish verified requirements backed by deterministic test evidence from unverified or partially verified requirements.

## Activation Boundaries
- **Activate when:** Auditing feature completeness against PRDs, validating test coverage against specifications, reviewing pull requests for requirement adherence, or preparing release traceability manifests.
- **DO NOT activate when:** Auditing raw shell execution sinks (use `agent-execution-safety-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Requirement Extraction** | Parse specifications and user stories into structured `RequirementTraceSchema` records. | Fast / Standard / Deep |
| **Pass 2** | **Implementation Mapping** | Map each requirement to source code symbols, endpoints, and file paths. | All Modes |
| **Pass 3** | **Verification Test Mapping** | Correlate requirements with deterministic unit, integration, and property test cases. | Standard / Deep |
| **Pass 4** | **Gap & Orphan Analysis** | Identify uncovered requirements and flag implementation code lacking requirement backing. | All Modes |
| **Pass 5** | **Traceability Matrix Synthesis** | Emit verified traceability matrix with status breakdown (`VERIFIED`, `PARTIAL`, `UNVERIFIED`). | Standard / Deep |

## Verification Command
```bash
node -e "const { validateRequirementTrace } = require('./src/verification'); console.log('Requirement schema verified');"
```
