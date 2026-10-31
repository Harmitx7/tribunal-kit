---
name: redis-caching-patterns
description: "Use when implementing cache-aside, write-through, cache stampede protection (probabilistic early expiration), cache penetration defense, and Redis data structures."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - backend-redis
  - throughput-optimizer
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
  - "redis caching patterns"
  - "cache stampede prevention"
  - "cache penetration defense"
  - "probabilistic early expiration"
  - "redis data modeling"
  - "cache aside write through"
---

# Redis Caching Architectures, Consistency & Stampede Defense

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `redis-caching-patterns` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Identify caching strategy (Cache-Aside, Write-Through, Write-Behind)
2. **Runtime Context & Platform Invariants**: Confirm TTL configuration on all cached keys to prevent memory leaks
3. **Execution Guardrails**: Evaluate cache stampede risk on high-traffic keys and implement probabilistic early expiration (XFetch) or mutex locks
4. **Validation & Type Contracts**: Inspect cache penetration risks and implement Bloom filters or negative caching for non-existent entities
5. **Observability & Proof of Execution**: Select optimal Redis data structures (Strings, Hashes, Sorted Sets, Streams)

## Activation Boundaries
- **Activate when:** Use when implementing cache-aside, write-through, cache stampede protection (probabilistic early expiration), cache penetration defense, and Redis data structures.
- **DO NOT activate when:** The task falls outside the `redis-caching-patterns` domain or is managed by a different dedicated specialist agent.

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
1. **Always set TTLs**: no key should be stored without an expiration policy unless deliberately managed as persistent storage.
2. **Prevent cache stampedes on hot keys**: use the XFetch algorithm (probabilistic early recomputation) or singleflight/mutex locking.
3. **Cache null values with short TTLs (e.g. 60s) to prevent cache penetration attacks repeatedly querying the database for non-existent IDs.**: Cache null values with short TTLs (e.g. 60s) to prevent cache penetration attacks repeatedly querying the database for non-existent IDs.
4. **Use Redis Hashes (`HSET`/`HGET`) for structured objects to allow updating individual fields without serializing/deserializing entire JSON blobs.**: Use Redis Hashes (`HSET`/`HGET`) for structured objects to allow updating individual fields without serializing/deserializing entire JSON blobs.

## Hallucination Traps (Read First)
❌ Deleting and re-querying hot keys simultaneously across 100 threads (Cache Stampede) → ✅ Use background early recomputation or distributed locks
❌ Using `KEYS *` in production commands which blocks single-threaded Redis → ✅ Use `SCAN` with cursor for iterative key discovery
❌ Setting identical TTLs across 100,000 keys causing synchronized bulk expiration → ✅ Add random jitter: `ttl = 3600 + Math.random() * 300`
❌ Storing unbounded lists that grow indefinitely → ✅ Use `LTRIM` or Redis Streams with maxlen to cap historical logs

---

### 1. Cache-Aside with XFetch Probabilistic Early Recomputation
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface CachedItem<T> {
  value: T;
  delta: number; // Duration to compute value in seconds
  expiry: number; // Unix timestamp in seconds
}

// XFetch algorithm for zero-stampede background caching
export async function getOrCompute<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>,
  beta: number = 1.0
): Promise<T> {
  const cachedRaw = await redis.get(key);

  if (cachedRaw) {
    const item: CachedItem<T> = JSON.parse(cachedRaw);
    const now = Date.now() / 1000;

    // XFetch probabilistic condition: now - (delta * beta * ln(random())) > expiry
    const shouldRecomputeEarly = (now - (item.delta * beta * Math.log(Math.random()))) > item.expiry;

    if (!shouldRecomputeEarly) {
      return item.value;
    }
  }

  // Compute fresh value
  const start = Date.now();
  const freshValue = await computeFn();
  const delta = (Date.now() - start) / 1000;

  const cachePayload: CachedItem<T> = {
    value: freshValue,
    delta,
    expiry: (Date.now() / 1000) + ttlSeconds,
  };

  // Add random jitter to TTL
  const jitterTtl = ttlSeconds + Math.floor(Math.random() * 30);
  await redis.set(key, JSON.stringify(cachePayload), 'EX', jitterTtl);

  return freshValue;
}
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Performance
1. Check Redis memory usage and eviction stats:
   ```bash
   redis-cli info memory
   redis-cli info stats | grep -E "evicted_keys|keyspace_hits|keyspace_misses"
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


