---
name: api-contract-verification-auditor
description: "Use when validating API contracts, JSON schemas, protocol serialization, backward compatibility, and detecting schema drift."
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
  baseline_schema: "object"
  candidate_schema: "object"
outputs:
  compatible: "boolean"
  breaking_changes: "array"
  schema_drift: "array"
trigger:
  - "api contract verification"
  - "schema drift audit"
  - "breaking change detection"
  - "api backward compatibility"
  - "contract drift check"
  - "api-contract-verification-auditor"
---

# API Contract Verification Auditor

## Mandatory Pre-Flight Context Inspection
Before certifying API schemas or validating contract compatibility, inspect these 5 critical parameters:
1. **Backward Compatibility Axiom**: Existing fields cannot be removed or have their types altered; new required fields cannot be added without consumer versioning.
2. **Schema Drift Detection**: Compare candidate API responses and schemas against baseline contracts using strict structural validation.
3. **Serialization Invariance**: Verify that serialization followed by deserialization preserves exact data equality: $\text{deserialize}(\text{serialize}(x)) = x$.
4. **Boundary & Malformed Payloads**: Test API endpoints with boundary values, extra unexpected properties, and invalid data types.
5. **Error Contract Conformance**: Ensure API error responses conform to standardized error schemas with typed error codes.

## Activation Boundaries
- **Activate when:** Modifying public REST/GraphQL APIs, updating database serialization formats, auditing OpenAPI specifications, or updating MCP tool definitions.
- **DO NOT activate when:** Auditing internal variable naming (use `clean-code`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Contract Ingestion** | Ingest baseline and candidate API schemas (Zod, OpenAPI, JSON Schema). | Fast / Standard / Deep |
| **Pass 2** | **Diff Analysis** | Detect removed properties, altered property types, and newly mandatory fields. | All Modes |
| **Pass 3** | **Roundtrip Serialization** | Test roundtrip serialization and deserialization invariance across data types. | Standard / Deep |
| **Pass 4** | **Error Schema Audit** | Verify that rejection responses adhere to standard error contract shapes. | All Modes |
| **Pass 5** | **Compatibility Gate** | Emit contract compatibility report; block release if breaking changes exist. | Standard / Deep |

## Verification Command
```bash
node -e "const { VerificationCaseSchema } = require('./src/verification'); console.log('Contract schema verified');"
```
