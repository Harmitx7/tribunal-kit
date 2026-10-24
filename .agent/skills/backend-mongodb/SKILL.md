---
name: backend-mongodb
description: "Use when analyzing, querying, designing, and hardening MongoDB schemas, indexes, and aggregation pipelines. Covers compound indexes, NoSQL injection prevention, schema validation, transaction boundaries, and projection safety."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - database-design
  - backend-security-expert
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "backend"
  - "mongodb"
  - "analyzing"
---

# MongoDB Architecture & Security Mastery

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


## Mandatory Pre-Flight Context Inspection
1. **Driver & Server Version**: Verify Mongoose or native MongoDB driver version (v5 vs v6+) and connection URI options.
2. **Schema Models**: Inspect Mongoose schema definitions or collection validation rules (`validator: { $jsonSchema: ... }`).
3. **Compound Index Prefixing**: Verify that queries match the equality, sort, range (ESR) rule on compound indexes.
4. **Input Sanitization**: Inspect how incoming request parameters reach collection queries; block operator injection.
5. **Memory Limits in Aggregations**: Ensure pipelines contain `$limit` before sorting or heavy projection stages.

## Activation Boundaries
- **Activate when:** Writing MongoDB queries, building aggregation pipelines, defining Mongoose schemas, or hardening against NoSQL injection.
- **DO NOT activate when:** The project uses relational databases (PostgreSQL, MySQL) or client-side caching.

## 🛠️ Technical Architecture & Reference Recipes

### 1. NoSQL Injection Prevention
```typescript
// ❌ VULNERABLE: Direct object pass allows { "$gt": "" } bypassing auth
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.collection('users').findOne({ username, password });
  if (user) generateSession(res, user);
});

// ✅ SECURE: Strict schema parsing (Zod) + casting to string primitive
import { z } from 'zod';

const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8)
});

app.post('/api/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const { username, password } = parsed.data;
  const user = await db.collection('users').findOne({ 
    username: String(username), 
    passwordHash: await hashPassword(String(password)) 
  });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  generateSession(res, user);
});
```

### 2. ESR Index Optimization (Equality, Sort, Range)
```javascript
// Query pattern: Find active orders for user, sorted by date, with amount > 100
// db.orders.find({ userId: uid, status: 'ACTIVE', total: { $gt: 100 } }).sort({ createdAt: -1 })

// ✅ ESR Index order: 
// 1. Equality: userId, status
// 2. Sort: createdAt
// 3. Range: total
db.orders.createIndex(
  { userId: 1, status: 1, createdAt: -1, total: 1 },
  { name: 'idx_orders_esr', background: true }
);
```

### 3. Safe Multi-Document Transactions
```typescript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await orders.updateOne(
      { _id: orderId, status: 'PENDING' },
      { $set: { status: 'PAID', paidAt: new Date() } },
      { session }
    );
    await inventory.updateOne(
      { sku: itemSku, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { session }
    );
  }, {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
  });
} finally {
  await session.endSession();
}
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Unbounded Projection** | Documents with massive arrays or base64 files exhaust Node.js heap memory | Always pass explicit projection `{ projection: { bio: 1, avatarUrl: 1, _id: 1 } }` |
| **Pipeline Memory Exceeded** | Sorting >100MB in memory without index crashes with `13848 ExceededMemoryLimit` | Place `$match` and `$limit` early; index the sort field; enable `allowDiskUse: true` only when necessary |
| **Unchecked Write Concern** | Primary writes return before replica acknowledgment, risking data loss on failover | Always use `writeConcern: { w: 'majority', j: true }` for critical state changes |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Blind `$where` Evaluation** | Using `$where: "this.a == this.b"` | Avoid `$where` completely; it executes arbitrary JS, introduces injection, and bypasses indexes |
| **Missing `$limit` on Collections** | Calling `.find({}).toArray()` | Always attach bounded `.limit(PAGE_SIZE)` to prevent OOM on production scale |
| **Nested Array Unchecked Growth** | Appending logs into a single document without boundary | Cap arrays using `$slice` or create a separate time-series / event collection |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `security-auditor`, `schema-reviewer`
- **Evidence Standard:** Categorize each finding as `[OBSERVED]` (concrete query/schema in repo), `[INFERRED]` (index utilization hypothesis), or `[UNVERIFIED]`.
