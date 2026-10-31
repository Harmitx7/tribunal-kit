---
name: nosql-document-modeling
description: "Use when designing MongoDB and Document database schemas, embedding vs referencing decision matrices, bucket patterns, and defending against unbounded array growth."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - backend-mongodb
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "nosql document modeling"
  - "mongodb schema design"
  - "embedding vs referencing mongodb"
  - "unbounded array defense"
  - "bucket pattern mongodb"
  - "document database architecture"
---

# NoSQL Document Database (MongoDB) Schema Architecture

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `nosql-document-modeling` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Analyze data access patterns: design schema around application queries, NOT relational normalization
2. **Runtime Context & Platform Invariants**: Evaluate 1-to-N relationships: 1-to-few (embed) vs 1-to-many (reference) vs 1-to-squillions (parent reference)
3. **Execution Guardrails**: Check maximum document size limit (16MB in MongoDB)
4. **Validation & Type Contracts**: Ensure compound indexes match query filter prefixes in strict order
5. **Observability & Proof of Execution**: Verify schema versioning strategy (`schemaVersion: 2`) for graceful schema evolution

## Activation Boundaries
- **Activate when:** Use when designing MongoDB and Document database schemas, embedding vs referencing decision matrices, bucket patterns, and defending against unbounded array growth.
- **DO NOT activate when:** The task falls outside the `nosql-document-modeling` domain or is managed by a different dedicated specialist agent.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Invariants
1. **Data that is accessed together should be stored together**: embed child data if parent and children are always fetched as a unit.
2. **Defend against the Unbounded Array anti-pattern**: never push items infinitely into a document array without an upper boundary (e.g. cap at 50 or use the Bucket Pattern).
3. **Compound index prefix rule**: an index on `{ tenantId: 1, status: 1, createdAt: -1 }` can service queries on `tenantId` and `tenantId + status`, but NOT `status` alone.
4. **Include `schemaVersion` on all polymorphic documents to enable zero-downtime application-level migrations.**: Include `schemaVersion` on all polymorphic documents to enable zero-downtime application-level migrations.

## Hallucination Traps (Read First)
❌ Treating MongoDB like a relational database with dozens of `$lookup` joins across collections → ✅ Embed related data or rethink aggregate boundaries
❌ Letting document arrays grow indefinitely (e.g. `comments: []` on a viral post) → ✅ Store comments in a separate collection with a `postId` reference
❌ Neglecting indexing on embedded fields queried in `$match` → ✅ Create explicit dot-notation indexes: `db.users.createIndex({ "profile.city": 1 })`
❌ Updating documents with unbounded growing fields causing document moves on disk → ✅ Use pre-allocated buckets or separate high-churn fields

---

### 1. Bucket Pattern for Time-Series / Telemetry
```javascript
// ❌ BAD: One document per sensor ping (millions of small docs) OR one doc with 100,000 array items
// ✅ OPTIMAL: Bucket Pattern (1 document per hour with max 60 data points)
{
  "_id": ObjectId("671e..."),
  "sensorId": "sensor_warehouse_9",
  "bucketHour": ISODate("2026-10-27T10:00:00Z"),
  "count": 60,
  "readings": [
    { "timestamp": ISODate("2026-10-27T10:00:00Z"), "tempC": 21.4, "humidity": 45 },
    { "timestamp": ISODate("2026-10-27T10:01:00Z"), "tempC": 21.5, "humidity": 46 }
  ],
  "stats": {
    "minTemp": 21.2,
    "maxTemp": 22.1,
    "avgTemp": 21.6
  }
}
```

### 2. Compound Index Ordering Heuristic (Equality, Sort, Range - ESR)
```javascript
// Query: Find orders for customer, sorted by date, with total > $50
// db.orders.find({ customerId: "c_1", total: { $gt: 50 } }).sort({ createdAt: -1 })

// ESR Rule: Equality (customerId) -> Sort (createdAt) -> Range (total)
db.orders.createIndex(
  { customerId: 1, createdAt: -1, total: 1 },
  { name: "idx_orders_customer_date_total" }
);
```

---

## Diagnostic Procedures & Verification Commands
### Diagnostics Command
```bash
# Explain query plan in MongoDB shell
mongosh --eval "db.orders.find({ customerId: 'c_1' }).explain('executionStats')"
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?
✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?
✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?
✅ Did I verify table and column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


