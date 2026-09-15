---
name: domain-modeling
description: Use when Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - architecture
  - codebase-design
  - database-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Domain Modeling — Ubiquitous Language & Bounded Contexts

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `domain-modeling` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code.
- **DO NOT activate when:** The task falls outside the `domain-modeling` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Domain Modeling Rules

### 1. Establish Ubiquitous Language

- Agree on strict, unambiguous terms used identically across domain experts, code variable names, database tables, and UI copy.
  - ❌ _User_, _Account_, _Member_, _Client_ used interchangeably for the same concept.
  - ✅ Define 1 clear term: **Customer** (for billing context) vs **User** (for authentication context).

### 2. Define Bounded Contexts

- Separate large systems into distinct bounded contexts. An entity named `Product` in the _Inventory Context_ (stock level, warehouse bin) has different attributes than `Product` in the _Catalog Context_ (hero image, pricing).

### 3. Aggregates & Invariants

- An **Aggregate Root** (e.g. `Order`) enforces internal business invariants across child entities (`OrderItem`).
- Never mutate a child entity (`OrderItem`) directly without passing through the aggregate root method (`order.addItem(product, qty)`).

### 4. Value Objects Over Primitives

- Wrap primitives into type-safe Value Objects to enforce validation logic:

```typescript
// Value Object enforcing domain rule
export class EmailAddress {
  private readonly value: string;

  constructor(email: string) {
    if (!email.includes('@')) throw new Error('Invalid email domain');
    this.value = email.toLowerCase().trim();
  }

  public toString(): string {
    return this.value;
  }
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                     | What AI Commonly Does Wrong                                                   | What Is Actually Correct                                                      |
| :------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Full Table Scan Blindspot**    | Querying high-cardinality tables without index coverage                       | Verify query plans with EXPLAIN ANALYZE and add composite B-Tree indexes      |
| **Non-Atomic Batch Mutation**    | Executing multiple related DB writes sequentially without transaction wrapper | Wrap multi-table updates in an atomic transaction with automatic rollback     |
| **Destructive Schema Migration** | Dropping or renaming columns in production without multi-phase migration      | Use expand-and-contract: add new column, sync data, migrate callers, drop old |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are indexes defined for all foreign keys, joins, and filtered query clauses?
✅ Are transactions wrapped atomically with rollbacks on failure?
✅ Are migration scripts backwards-compatible (expand-and-contract pattern)?
✅ Did I verify column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
