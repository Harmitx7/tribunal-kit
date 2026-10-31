---
name: prisma-database-mastery
description: "Use when analyzing, optimizing, and hardening Prisma ORM queries, resolving N+1 relations with joins, tuning connection pools, and managing schema drift."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - typescript-advanced
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
  - "prisma database mastery"
  - "prisma n+1 query optimization"
  - "prisma relationloadstrategy join"
  - "prisma interactive transactions"
  - "prisma schema drift"
  - "prisma connection pool tuning"
---

# Prisma ORM Performance & Production Hardening Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `prisma-database-mastery` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify Prisma Client version is 5.10+ (supporting `relationLoadStrategy: "join"`)
2. **Runtime Context & Platform Invariants**: Inspect schema for missing indexes on foreign keys and relation fields
3. **Execution Guardrails**: Check connection string parameters for pool limits (`connection_limit`) in serverless environments
4. **Validation & Type Contracts**: Ensure Prisma schema drift is validated against actual database schema with `prisma migrate diff`
5. **Observability & Proof of Execution**: Verify interactive transaction timeouts are configured explicitly

## Activation Boundaries
- **Activate when:** Use when analyzing, optimizing, and hardening Prisma ORM queries, resolving N+1 relations with joins, tuning connection pools, and managing schema drift.
- **DO NOT activate when:** The task falls outside the `prisma-database-mastery` domain or is managed by a different dedicated specialist agent.

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
1. **Use `relationLoadStrategy**: "join"` for 1-to-many and 1-to-1 queries: prevent Prisma from executing multiple roundtrip queries to fetch related models.
2. **Index foreign keys explicitly**: Prisma schema does NOT automatically generate PostgreSQL indexes on `@relation(fields: [authorId])`.
3. **Set explicit transaction timeouts**: `prisma.$transaction(fn, { timeout: 10000, maxWait: 2000 })` prevents transaction deadlocks.
4. **Never execute unrestricted `findMany()` queries**: always enforce `take` (pagination limit) to prevent memory exhaustion.

## Hallucination Traps (Read First)
❌ Default Prisma `include` executing N queries sequentially → ✅ Set `relationLoadStrategy: "join"` in Prisma query to generate a single SQL JOIN
❌ Creating new `new PrismaClient()` instances inside serverless function handlers → ✅ Instantiate a single global singleton client
❌ Unindexed relation fields causing sequential scans on parent lookups → ✅ Add `@@index([authorId])` in `schema.prisma`
❌ Modifying database schema directly without running `prisma migrate dev` → ✅ Keep Prisma migration history in sync with Git commits

---

### 1. Eliminating N+1 with `relationLoadStrategy: 'join'`
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ✅ High-Performance Single SQL Query with JOIN
export async function getOrdersWithItems(customerId: string) {
  return await prisma.order.findMany({
    where: { customerId },
    take: 50,
    orderBy: { createdAt: 'desc' },
    relationLoadStrategy: 'join', // Executes single SQL JOIN instead of N roundtrips!
    include: {
      items: true,
      shippingAddress: true,
    },
  });
}
```

### 2. Prisma Schema Indexing Best Practice (`schema.prisma`)
```prisma
model Order {
  id          String      @id @default(uuid())
  customerId  String
  status      OrderStatus @default(PENDING)
  totalCents  Int
  createdAt   DateTime    @default(now())
  customer    Customer    @relation(fields: [customerId], references: [id])
  items       OrderItem[]

  // Mandatory composite and foreign key indexes!
  @@index([customerId])
  @@index([status, createdAt(sort: Desc)])
}
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Schema Drift Check
1. Validate Prisma schema against production database:
   ```bash
   npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code
   ```
2. Generate fresh typed client after schema edits:
   ```bash
   npx prisma generate
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


